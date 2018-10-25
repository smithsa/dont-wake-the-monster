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
            'timeout': 12000,
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

        ctx.openMicrophone = false;
        return handlerInput.responseBuilder.getResponse();

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

                let winners = HelperFunctions.getWinner(sessionAttributes.game.overallScore);
                console.log('Winners', winners);
                if(winners.length > 1){
                    let drawMsg = "It was a tie between: ";
                    let newWinnersList = [];
                    winners.reduce(function(accumulatedWinnerList, currentValue, currentIndex, winnersList) {
                        if(currentIndex == winnersList.length-1){
                            accumulatedWinnerList.push("and the "+sessionAttributes.game.playerCharacter[currentValue]);
                        }else{
                            accumulatedWinnerList.push("the "+sessionAttributes.game.playerCharacter[currentValue]);
                        }
                        return accumulatedWinnerList;
                    }, newWinnersList);
                    let finalMsg = drawMsg + newWinnersList.join(', ') + ".";
                    ctx.outputSpeech.push(finalMsg);

                 }else{
                    let winning_Score = sessionAttributes.game.overallScore[winners[0]];
                    ctx.outputSpeech.push("Congratulations are in order for the "+sessionAttributes.game.playerCharacter[winners[0]]+". With a total of "+winning_Score+" magical "+( winning_Score == 1 ? 'bean' : 'beans')+", you won the game! ");
                }

                ctx.outputSpeech.push("Would you like to play again? Yes, or no?");

            }else{
                ctx.directives.push(GadgetDirectives.setIdleAnimation({
                    'targetGadgets': deviceIds,
                    'animations': BasicAnimations.SolidAnimation(1, 'red', 2000)
                } ));

                let currentCharacter = sessionAttributes.game.playerCharacter["player"+sessionAttributes.game.currentPlayer];
                ctx.outputSpeech = [Settings.TRAP_AUDIO];
                ctx.outputSpeech.push(Settings.GROWL_AUDIO);
                ctx.outputSpeech.push("Oh no! You set off one of the traps. Your turn is over. It is now the turn of the "+currentCharacter+". You can say go if you want to take your turn. Or pass to skip it.");
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