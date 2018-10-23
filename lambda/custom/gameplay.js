/*
 * Copyright 2018 Amazon.com, Inc. and its affiliates. All Rights Reserved.
 *
 * Licensed under the Amazon Software License (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 * http://aws.amazon.com/asl/
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

'use strict';

const Alexa = require('ask-sdk-core');
// Gadget Directives Builder
const GadgetDirectives = require('util/gadgetDirectives.js');
//helperfunctions
const HelperFunctions = require('util/helper.js');
// Basic Animation Helper Library
const BasicAnimations = require('button_animations/basicAnimations.js');
// import the skill settings constants 
const Settings = require('settings.js');

const GAME_PLAY_ANIMATIONS = {
    'ChooseCharactersComplete': {
        'targetGadgets': [],
        'animations': BasicAnimations.FadeInAnimation(1, "white", 3000)
    }
};
    
// Define a recognizer for button down events that will match when any button is pressed down.
// We'll use this recognizer as trigger source for the "button_down_event" during play
// see: https://developer.amazon.com/docs/gadget-skills/define-echo-button-events.html#recognizers

//TODO: change to fuzzy false and add up down actions
const playerStepDirective = (deviceID) => {
    let recognizer = {
        "step_recognizer": {
            "type": "match",
            "fuzzy": true,
            "gadgetIds": [deviceID],
            "anchor": "end",
            "pattern": [
                {
                    "gadgetIds": [deviceID],
                    "action": "down"
                }
            ]
        }
    };

    return recognizer;
}

// Define named events based on the DIRECT_BUTTON_DOWN_RECOGNIZER and the built-in "timed out" recognizer
// to report back to the skill when either of the two buttons in play was pressed and eventually when the
// input handler times out
// see: https://developer.amazon.com/docs/gadget-skills/define-echo-button-events.html#define
const DIRECT_MODE_EVENTS = {
    "step_event": {
        "meets": ["step_recognizer"],
        "reports": "history",
        "maximumInvocations": Settings.GAME.stepsAllowed,
        "shouldEndInputHandler": false
    },
    "timeout": {
        "meets": ["timed out"],
        "reports": "history",
        "shouldEndInputHandler": true
    }
};



// ***********************************************************************
//   PLAY_MODE Handlers
//     set up handlers for events that are specific to the Play mode
//     after the user registered the buttons - this is the main mode
// ***********************************************************************
const GamePlay = {
    incrementStepIntentHandler: function(handlerInput) {
        console.log("GamePlay::incrementStepIntent");
        const {attributesManager} = handlerInput;
        const ctx = attributesManager.getRequestAttributes();
        const sessionAttributes = attributesManager.getSessionAttributes();
        const { request } = handlerInput.requestEnvelope;

        let deviceIds = sessionAttributes.DeviceIDs;

        let gameCharacter = sessionAttributes.game.playerCharacter["player"+sessionAttributes.game.currentPlayer];
        let characterColor = sessionAttributes.characterProperties.find(function (item) {
            return item.name === gameCharacter;
        });

        characterColor = characterColor.color;
        let uColor = characterColor;

        ctx.openMicrophone = false;

        ctx.directives.push(GadgetDirectives.startInputHandler({
            'timeout': 10000,
            'recognizers': playerStepDirective(deviceIds[0]),
            'events': DIRECT_MODE_EVENTS
        } ));

        // Save Input Handler Request ID
        sessionAttributes.CurrentInputHandlerID = request.requestId;
        console.log("Current Input Handler ID: " + sessionAttributes.CurrentInputHandlerID);

        // Build 'button down' animation, based on the users color of choice, for when the button is pressed
        ctx.directives.push(GadgetDirectives.setButtonDownAnimation({
            'targetGadgets': deviceIds,
            'animations': BasicAnimations.SolidAnimation(1, uColor, 2000)
        } ));

        // build 'button up' animation, based on the users color of choice, for when the button is released
        ctx.directives.push(GadgetDirectives.setButtonUpAnimation({
            'targetGadgets': deviceIds,
            'animations': BasicAnimations.SolidAnimation(1, uColor, 200)
        } ));

        sessionAttributes.game.turnScore = 0;
        ctx.outputSpeech.push(ctx.t('INCREMENT_STEP_MESSAGE'));

        let currentPLayerNumber = parseInt(sessionAttributes.game.currentPlayer);
        sessionAttributes.game.currentPlayer = ( currentPLayerNumber == parseInt(sessionAttributes.game.playerCount) ?  1 : currentPLayerNumber+1);
        // sessionAttributes.game.currentPlayer = currentPLayerNumber+1;
        // if(currentPLayerNumber == parseInt(sessionAttributes.game.playerCount)){
        //     sessionAttributes.game.currentPlayer = 1;
        // }


        ctx.openMicrophone = false;
        return handlerInput.responseBuilder.getResponse();

    },
    AddPlayersIntentHandler: function(handlerInput) {
        console.log("GamePlay::addPlayersIntent");
        const {attributesManager} = handlerInput;
        const ctx = attributesManager.getRequestAttributes();
        const sessionAttributes = attributesManager.getSessionAttributes();
        const { request } = handlerInput.requestEnvelope;

        const numberPlayers = parseInt(request.intent.slots.numPlayers.value);

        if (numberPlayers === undefined) {
            ctx.reprompt = [ctx.t('NUM_PLAYERS_GIVE_NUMBER_AGAIN')];
            ctx.outputSpeech = [ctx.t('HELP_SYMPATHY') + ctx.reprompt[0]];
            ctx.openMicrophone = false;
            return handlerInput.responseBuilder.getResponse();
        }else if(numberPlayers > 4 || numberPlayers < 2){
            ctx.reprompt = [ctx.t('NUM_PLAYERS_GIVE_NUMBER_AGAIN')];
            if(numberPlayers > 4){
                ctx.outputSpeech = [ctx.t('NUM_PLAYERS_TOO_MANY_PLAYERS') + ctx.reprompt[0]];
            }else{
                ctx.outputSpeech = [ctx.t('NUM_PLAYERS_TOO_FEW_PLAYERS') + ctx.reprompt[0]];
            }
            ctx.openMicrophone = false;
            return handlerInput.responseBuilder.getResponse();
        }else {
            //TODO  set overall score and round score objects here
            sessionAttributes.game.overallScore = {};
            sessionAttributes.game.roundScore = {};
            for(let i =1; i < numberPlayers+1; i++){
                sessionAttributes.game.overallScore["player"+i] = 0;
                sessionAttributes.game.roundScore["player"+i] = 0;
            }
            let deviceIds = sessionAttributes.DeviceIDs;
            sessionAttributes.game.playerCount = numberPlayers;

            sessionAttributes.state = Settings.SKILL_STATES.CHOOSE_CHARACTER_MODE;


            //TODO add animations for adding players

            console.log('**list ', sessionAttributes.characterProperties);
            let availableCharacters = sessionAttributes.characterProperties.reduce(function(acc, list_item) {
                 acc.push(list_item.name);
                 return acc;
                }, []).reduce(function(accumulator, name, index, list){
                if(index === list.length-1){
                    accumulator = accumulator + ", and " + name;
                }else if(index == 0){
                    accumulator = accumulator + name;
                }else{
                    accumulator = accumulator + ", " + name;
                }
                return accumulator;
            }, "");


            ctx.outputSpeech = [ctx.t('NUM_PLAYERS_ADDED_CONFIRMATION', numberPlayers)];
            ctx.outputSpeech.push(ctx.t('CHOOSE_CHARACTER_INSTRUCTION_1'));
            ctx.outputSpeech.push(ctx.t('CHOOSE_CHARACTER_INSTRUCTION_2', availableCharacters));
            ctx.outputSpeech.push(ctx.t('CHOOSE_CHARACTER_INSTRUCTION_3'));

            return handlerInput.responseBuilder.getResponse();
        }
    },
    ChooseCharacterIntentHandler: function(handlerInput) {
        console.log("GamePlay::chooseCharacterIntent");
        const {attributesManager} = handlerInput;
        const ctx = attributesManager.getRequestAttributes();
        const sessionAttributes = attributesManager.getSessionAttributes();
        const { request } = handlerInput.requestEnvelope;

        let gameCharacterSlot = request.intent.slots.gameCharacter;
        let gameCharacter = undefined;
        if(gameCharacterSlot !== undefined){
            console.log("** resolutionsPerAuthority", gameCharacterSlot);
            if (gameCharacterSlot.confirmationStatus !== 'CONFIRMED' && gameCharacterSlot.resolutions && gameCharacterSlot.resolutions.resolutionsPerAuthority[0]) {
                if (gameCharacterSlot.resolutions.resolutionsPerAuthority[0].status.code == 'ER_SUCCESS_MATCH') {
                    gameCharacter = gameCharacterSlot.resolutions.resolutionsPerAuthority[0].values[0].value.name;
                }
            }
        }

        let chosenCharactersBeforePick = sessionAttributes.chosenCharacters;
        let charactersList = sessionAttributes.characterProperties.reduce(function(list, list_item) {
                list.push(list_item.name);
                return list;
            }, []
        );

        let availableCharactersStringBeforePick = HelperFunctions.getRemainingCharacterNames(chosenCharactersBeforePick, charactersList);

        let is_already_chosen = sessionAttributes.chosenCharacters.some(function(name){
            return name === gameCharacter;
        });

        if (gameCharacter === undefined) {
            ctx.reprompt = [ctx.t('CHOOSE_CHARACTER_UNDEFINED', availableCharactersStringBeforePick)];
            ctx.outputSpeech = [ctx.t('HELP_SYMPATHY') + ctx.reprompt[0]];
            ctx.openMicrophone = false;
            return handlerInput.responseBuilder.getResponse();
        }else if(is_already_chosen){
            ctx.reprompt = [ctx.t('CHOOSE_CHARACTER_UNAVAILABLE_REPROMPT', availableCharactersStringBeforePick)];
            ctx.outputSpeech = [ctx.t('CHOOSE_CHARACTER_UNAVAILABLE') + ctx.reprompt[0]];
            ctx.openMicrophone = false;
            return handlerInput.responseBuilder.getResponse();
        }else {
            let deviceIds = sessionAttributes.DeviceIDs;
            //set the players character and get the next character counts
            let currentPlayer = sessionAttributes.game.currentPlayer;
            let nextPlayer = currentPlayer + 1;
            let currentPlayerKey = "player"+currentPlayer;
            //next current player
            sessionAttributes.game.currentPlayer = nextPlayer;
            sessionAttributes.game.playerCharacter[currentPlayerKey] = gameCharacter;

            //adding character so no one else can choose in future
            sessionAttributes.chosenCharacters.push(gameCharacter);

            //get the color of the character
            let characterColor = sessionAttributes.characterProperties.find(function (item) {
                return item.name === gameCharacter;
            });
            console.log("** color", characterColor);
            characterColor = characterColor.color;

            // Save Input Handler Request ID
            sessionAttributes.CurrentInputHandlerID = request.requestId;
            console.log("Current Input Handler ID: " + sessionAttributes.CurrentInputHandlerID);

            //TODO: add animation for the player picked.
            ctx.directives.push(GadgetDirectives.setIdleAnimation({
                'targetGadgets': deviceIds,
                'animations': BasicAnimations.FadeInAnimation(3, characterColor, 3000)
            } ));

            let chosenCharacters = sessionAttributes.chosenCharacters;
            let availableCharactersString = HelperFunctions.getRemainingCharacterNames(chosenCharacters, charactersList);

            ctx.openMicrophone = false;
            ctx.outputSpeech = [ctx.t('PLAYER_CONFIRMATION', currentPlayer, gameCharacter, characterColor)];
            if(sessionAttributes.chosenCharacters.length === 3 && sessionAttributes.game.playerCount == 4){
                ctx.outputSpeech.push(ctx.t('CHOOSE_CHARACTER_NO_CHOICE', availableCharactersString, characterColor));
                //TODO add animation color for the last player
                //TODO add reprompt for game instructions
            }else{
                ctx.reprompt = [ctx.t('CHOOSE_CHARACTER_NEXT_PLAYER_REPROMPT', availableCharactersString)];
            }

            if(sessionAttributes.game.playerCount == currentPlayer){
                // ctx.directives.push(GadgetDirectives.setIdleAnimation(
                //     GAME_PLAY_ANIMATIONS.ChooseCharactersComplete, { 'targetGadgets': [sessionAttributes.DeviceIDs[0]] } ));

                sessionAttributes.game.currentPlayer = 1;
                ctx.outputSpeech.push(ctx.t('CHOOSE_CHARACTER_DONE'));
                ctx.outputSpeech.push(Settings.DRAMA_AUDIO);
                ctx.outputSpeech.push(ctx.t('GAME_INSTRUCTIONS_1'));
                ctx.outputSpeech.push(ctx.t('GAME_INSTRUCTIONS_2', Settings.GAME.stepsAllowed));
                ctx.outputSpeech.push(ctx.t('GAME_INSTRUCTIONS_3'));
                ctx.outputSpeech.push(ctx.t('GAME_INSTRUCTIONS_START'));


                sessionAttributes.state = Settings.SKILL_STATES.PLAY_MODE;
                return handlerInput.responseBuilder.getResponse();
            }

            ctx.outputSpeech.push(ctx.t('CHOOSE_CHARACTER_REMAINING_CHARACTERS', availableCharactersString));
            ctx.outputSpeech.push(ctx.t('CHOOSE_CHARACTER_NEXT_PLAYER', nextPlayer));

            return handlerInput.responseBuilder.getResponse();
        }
    },
    HandleButtonStepped: function(handlerInput) {
        console.log("GamePlay::InputHandlerEvent::step_event");
        const {attributesManager} = handlerInput;
        const ctx = attributesManager.getRequestAttributes();
        const sessionAttributes = attributesManager.getSessionAttributes();


        sessionAttributes.game.isStartOfTurn = false;

        let deviceIds = sessionAttributes.DeviceIDs;
        let gameInputEvents = ctx.gameInputEvents;

        //check what is at the game board position
        let stepResult = HelperFunctions.checkMoveOnBoard(sessionAttributes.game.gameBoardPointer, sessionAttributes.game.mines, sessionAttributes.game.beans);
        if(stepResult === 1){
            let turnScore = sessionAttributes.game.turnScore;
            sessionAttributes.game.turnScore = turnScore + 1;

            let playerScoreKey = "player";
            playerScoreKey += (sessionAttributes.game.currentPlayer == 1 ? sessionAttributes.game.playerCount : parseInt(sessionAttributes.game.currentPlayer) - 1);
            sessionAttributes.game.overallScore[playerScoreKey] = parseInt(sessionAttributes.game.overallScore[playerScoreKey]) + 1;
            ctx.outputSpeech = [Settings.BEAN_AUDIO];
        }else if(stepResult === -1){
            //count the trap detonated so far
            let triggeredTrapCount = sessionAttributes.game.trapsTriggered;
            sessionAttributes.game.trapsTriggered = parseInt(triggeredTrapCount) + 1;
            console.log('TRIGGERED MINE TRAP:', sessionAttributes.game.trapsTriggered);
            console.log('MINE COUNT TRAP:', Settings.GAME.mineCount);

            if(sessionAttributes.game.trapsTriggered === Settings.GAME.mineCount){
                sessionAttributes.state = Settings.SKILL_STATES.END_GAME_MODE;
                ctx.outputSpeech = [Settings.TRAP_AUDIO];
                ctx.outputSpeech.push(Settings.ROAR_AUDIO);
                ctx.outputSpeech.push("You woke the monster. The game is over.");
                //TODO change winners to characters names
                let winners = HelperFunctions.getWinner(sessionAttributes.game.overallScore);
                winners[winners.length-1] = "and "+ winners[winners.length-1];
                console.log('Winners', winners);
                if(winners.length > 1){
                    let drawMsg = "It was a draw between, ";
                    let finalMsg = drawMsg + winners.join(',');
                    ctx.outputSpeech.push(finalMsg);

                 }else{
                    ctx.outputSpeech.push("Congrats "+winners[0]+" You won the game");
                }

                ctx.outputSpeech.push(". Would you like to play again? You can say Yes if so or No to exit.");

            }else{
                ctx.outputSpeech = [Settings.TRAP_AUDIO];
                ctx.outputSpeech.push(Settings.GROWL_AUDIO);
                ctx.outputSpeech.push("You suck!, You set off one of the traps. Your turn is over. Next player you can take your turn. You can say go if you want to take your turn. Or pass to skip it.");
            }

            if (sessionAttributes.CurrentInputHandlerID) {
                ctx.directives.push(GadgetDirectives.stopInputHandler({
                    'id': sessionAttributes.CurrentInputHandlerID
                }));
            }
        }else{
            ctx.outputSpeech = [Settings.STEP_AUDIO];
        }

        sessionAttributes.game.gameBoardPointer = sessionAttributes.game.gameBoardPointer + 1;

        ctx.openMicrophone = false;
        return handlerInput.responseBuilder.getResponse();
    }
};

module.exports = GamePlay;