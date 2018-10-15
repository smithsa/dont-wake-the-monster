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


    
// Define a recognizer for button down events that will match when any button is pressed down.
// We'll use this recognizer as trigger source for the "button_down_event" during play
// see: https://developer.amazon.com/docs/gadget-skills/define-echo-button-events.html#recognizers
const DIRECT_BUTTON_DOWN_RECOGNIZER = {
    "button_down_recognizer": {
        "type": "match",
        "fuzzy": false,
        "anchor": "end",
        "pattern": [{
                "action": "down"
            }
        ]
    }
};

//TODO: change to fuzzy false and add up down actions
const playerStepDirective = (deviceID) => {
    console.log('** Device ID', deviceID);
    let recognizer = {
        "step_recognizer": {
            "type": "match",
            "fuzzy": false,
            "gadgetIds": [deviceID],
            "anchor": "end",
            "pattern": [
                {
                    "gadgetIds": [deviceID],
                    "action": "down"
                },
                {
                    "gadgetIds": [deviceID],
                    "action": "up"
                }
            ]
        },
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
        "maximumInvocations": 5,
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

    incrementStepIntent: function(handlerInput) {
        console.log("GamePlay::incrementStepIntent");
        const {attributesManager} = handlerInput;
        const ctx = attributesManager.getRequestAttributes();
        const sessionAttributes = attributesManager.getSessionAttributes();
        const { request } = handlerInput.requestEnvelope;


        let deviceIds = sessionAttributes.DeviceIDs;

        let uColor = sessionAttributes.ColorChoice;
        deviceIds = deviceIds.slice(-2);

        ctx.directives.push(GadgetDirectives.startInputHandler({
            'timeout': 10000,
            'recognizers': playerStepDirective(deviceIds[1]),
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

        ctx.outputSpeech.push("Calling Increment Step Counter");


        ctx.openMicrophone = false;
        return handlerInput.responseBuilder.getResponse();

    },
    AddPlayersIntentHandler: function(handlerInput) {
        console.log("GamePlay::addPlayersIntent");
        const {attributesManager} = handlerInput;
        const ctx = attributesManager.getRequestAttributes();
        const sessionAttributes = attributesManager.getSessionAttributes();
        const { request } = handlerInput.requestEnvelope;

        const numberPlayers = request.intent.slots.numPlayers.value;

        if (numberPlayers === undefined) {
            ctx.reprompt = [ctx.t('NUM_PLAYERS_GIVE_NUMBER_AGAIN')];
            ctx.outputSpeech = [ctx.t('HELP_SYMPATHY') + ctx.reprompt[0]];
            ctx.openMicrophone = false;
            return handlerInput.responseBuilder.getResponse();
        }else if(numberPlayers > 4){
            ctx.reprompt = [ctx.t('NUM_PLAYERS_GIVE_NUMBER_AGAIN')];
            ctx.outputSpeech = [ctx.t('NUM_PLAYERS_TOO_MANY_PLAYERS') + ctx.reprompt[0]];
            ctx.openMicrophone = false;
            return handlerInput.responseBuilder.getResponse();
        }else {
            let deviceIds = sessionAttributes.DeviceIDs;
            sessionAttributes.game.playerCount = numberPlayers;

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
            ctx.outputSpeech.push(Settings.WAITING_AUDIO);
            sessionAttributes.state = Settings.SKILL_STATES.CHOOSE_CHARACTER_MODE;

            ctx.openMicrophone = false;
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

        //todo set if character is already in chosen sessionAttributes.chosenCharacters
        let is_already_chosen = sessionAttributes.chosenCharacters.some(function(name){
            return name === gameCharacter;
        });

        if (gameCharacter === undefined) {
            //TODO Give options here
            ctx.reprompt = [ctx.t('CHOOSE_CHARACTER_UNDEFINED', availableCharactersStringBeforePick)];
            ctx.outputSpeech = [ctx.t('HELP_SYMPATHY') + ctx.reprompt[0]];
            ctx.openMicrophone = false;
            return handlerInput.responseBuilder.getResponse();
        }else if(is_already_chosen){
            //TODO Give options here
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

            deviceIds = deviceIds.slice(-1);

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
                'animations': BasicAnimations.SolidAnimation(1, characterColor, 2000)
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
                ctx.outputSpeech.push(ctx.t('CHOOSE_CHARACTER_DONE'));
                ctx.outputSpeech.push(ctx.t('GAME_INSTRUCTIONS_1'));
                ctx.outputSpeech.push(ctx.t('GAME_INSTRUCTIONS_2'));
                ctx.outputSpeech.push(ctx.t('GAME_INSTRUCTIONS_3'));
                sessionAttributes.state = Settings.SKILL_STATES.PLAY_MODE;
                return handlerInput.responseBuilder.getResponse();
            }

            //TODO make availabe charcters a string so I can reference in the timeout
            ctx.outputSpeech.push(ctx.t('CHOOSE_CHARACTER_REMAINING_CHARACTERS', availableCharactersString));
            ctx.outputSpeech.push(ctx.t('CHOOSE_CHARACTER_NEXT_PLAYER', nextPlayer));
            ctx.outputSpeech.push(Settings.WAITING_AUDIO);

            return handlerInput.responseBuilder.getResponse();
        }
    },
    HandleButtonPressed: function(handlerInput) {
        console.log("GamePlay::InputHandlerEvent::button_down_event");
        const {attributesManager} = handlerInput;
        const ctx = attributesManager.getRequestAttributes();
        const sessionAttributes = attributesManager.getSessionAttributes();   
        
        let deviceIds = sessionAttributes.DeviceIDs;        
        let gameInputEvents = ctx.gameInputEvents;
        let buttonId = gameInputEvents[0].gadgetId;

        console.log('!! HISTORY HERE', ctx);
        console.log('!! SESSION HERE', sessionAttributes);
        // Checks for Invalid Button ID
        if (deviceIds.indexOf(buttonId) == -1) {
            console.log("Button event received for unregisterd gadget.");
            // Don't send any directives back to Alexa for invalid Button ID Events
            ctx.outputSpeech = ["Unregistered button"];
            ctx.outputSpeech.push("Only buttons registered during roll call are in play.");
            ctx.outputSpeech.push(Settings.WAITING_AUDIO);
        } else {
            var buttonNo = deviceIds.indexOf(buttonId);
            ctx.outputSpeech = ["Button " + buttonNo + ". "];
            ctx.outputSpeech.push(Settings.WAITING_AUDIO);            
        }



        ctx.openMicrophone = false;
        return handlerInput.responseBuilder.getResponse();
    },



    HandleButtonStepped: function(handlerInput) {
        console.log("GamePlay::InputHandlerEvent::step_event");
        const {attributesManager} = handlerInput;
        const ctx = attributesManager.getRequestAttributes();
        const sessionAttributes = attributesManager.getSessionAttributes();

        let deviceIds = sessionAttributes.DeviceIDs;
        let gameInputEvents = ctx.gameInputEvents;
        let buttonId = gameInputEvents[0].gadgetId;

        // Checks for Invalid Button ID
        if (deviceIds.indexOf(buttonId) == -1) {
            console.log("Button event received for unregisterd gadget.");
            // Don't send any directives back to Alexa for invalid Button ID Events
            ctx.outputSpeech = ["Unregistered button"];
            ctx.outputSpeech.push("Only buttons registered during roll call are in play.");
            //ctx.outputSpeech.push(Settings.WAITING_AUDIO);
        } else {
            var buttonNo = deviceIds.indexOf(buttonId);
            console.log('**BUTTON ID', buttonId);
            console.log('**DEVICE ID', deviceIds[2]);
            console.log('!! HISTORY HERE', ctx);
            console.log('!! SESSION HERE', sessionAttributes);
            console.log('$$ session handlerInput in event', handlerInput.requestEnvelope.request.events);

            ctx.outputSpeech = ["You pressed the button."];
            // if(buttonId !== deviceIds[2]){ //will get player 2 id
            //     ctx.outputSpeech = ["You are not the correct player."];
            // }else{
            //     ctx.outputSpeech = ["You pressed the button."];
            // }

            //ctx.outputSpeech.push(Settings.WAITING_AUDIO);
        }

        // ctx.directives.push(GadgetDirectives.startInputHandler({
        //     'timeout': 30000,
        //     'recognizers': playerStepDirective(deviceIds[1]),
        //     'events': DIRECT_MODE_EVENTS
        // } ));

        //let originatingRequestId = ctx;
        //console.log("!! SESSION ATTRIBUTES: ", sessionAttributes);
        //TODO: Give id here of the directive, will need the originatingRequestId
        //ctx.directives.push(GadgetDirectives.stopInputHandler({id: sessionAttributes.CurrentInputHandlerID}));

        ctx.openMicrophone = false;
        return handlerInput.responseBuilder.getResponse();
    }
};

module.exports = GamePlay;