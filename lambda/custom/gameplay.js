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
            ctx.reprompt = ["Please give me the number of player again."];
            ctx.outputSpeech = ["Sorry, I didn't get that. " + ctx.reprompt[0]];
            ctx.openMicrophone = false;
            return handlerInput.responseBuilder.getResponse();
        }else if(numberPlayers > 4){
            ctx.reprompt = ["Please give me the number of players again."];
            ctx.outputSpeech = ["Sorry, you have too many players. The maximum number of players is 4. " + ctx.reprompt[0]];
            ctx.openMicrophone = false;
            return handlerInput.responseBuilder.getResponse();
        }else {
            let deviceIds = sessionAttributes.DeviceIDs;
            sessionAttributes.game.playerCount = numberPlayers;

            //deviceIds = deviceIds.slice(-1);
            //TODO: handle animations at this point
            // ctx.directives.push(GadgetDirectives.setButtonDownAnimation({
            //     'targetGadgets': deviceIds,
            //     'animations': BasicAnimations.SolidAnimation(1, "red", 2000)
            // } ));
            //
            // // build 'button up' animation, based on the users color of choice, for when the button is released
            // ctx.directives.push(GadgetDirectives.setButtonUpAnimation({
            //     'targetGadgets': deviceIds,
            //     'animations': BasicAnimations.SolidAnimation(1, "red", 200)
            // } ));


            console.log('**list ', sessionAttributes.characterProperties);
            let availableCharacters = sessionAttributes.characterProperties.reduce(function(acc, list_item) {
                 acc.push(list_item.name);
                 return acc;
                }, []).reduce(function(accumulator, name, index, list){
                if(index === list.length-1){
                    accumulator = accumulator + ", and " + name;
                }else if(index == 0){
                    accumulator = accumulator + name + ", ";
                }else{
                    accumulator = accumulator + ", " + name;
                }
                return accumulator;
            }, "");


            ctx.outputSpeech = ["Ok. " + numberPlayers + " players it is."];
            ctx.outputSpeech.push("Now each player can choose a character.");
            ctx.outputSpeech.push("The character you can choose from are: "+availableCharacters+".");
            ctx.outputSpeech.push("Player 1, what character do you want?");
            ctx.outputSpeech.push(Settings.WAITING_AUDIO);

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

        let gameCharacter = request.intent.slots.gameCharacter.value;

        if (gameCharacter === undefined) {
            ctx.reprompt = ["Please give me the numb"];
            ctx.outputSpeech = ["Sorry, I didn't get that. " + ctx.reprompt[0]];
            ctx.openMicrophone = false;
            return handlerInput.responseBuilder.getResponse();
        }else if(gameCharacter in sessionAttributes.chosenCharacters){
            ctx.reprompt = ["Choose another character."];
            ctx.outputSpeech = ["Sorry, that character has already been picked by a player. " + ctx.reprompt[0]];
            ctx.openMicrophone = false;
            return handlerInput.responseBuilder.getResponse();
        }else {
            let deviceIds = sessionAttributes.DeviceIDs;
            //set the players character and get the next character counts
            let currentPlayer = sessionAttributes.game.currentPlayer;
            let currentPlayerKey = "player"+currentPlayer;
            sessionAttributes.game.currentPlayer = sessionAttributes.game.currentPlayer+1;
            sessionAttributes.game.playerCharacter[currentPlayerKey] = gameCharacter;

            //adding character so no one else can choose in future
            sessionAttributes.chosenCharacters.push(gameCharacter);

            deviceIds = deviceIds.slice(-1);

            //TODO get color animations
            //get the color of the character
            let characterColor = sessionAttributes.characterProperties.find(function (item) {
                return item.name == gameCharacter;
            });
            console.log('characterColor', characterColor);
            characterColor = characterColor.color;
            console.log('characterColor', characterColor);

            // Save Input Handler Request ID
            sessionAttributes.CurrentInputHandlerID = request.requestId;
            console.log("Current Input Handler ID: " + sessionAttributes.CurrentInputHandlerID);

            //TODO: add animation for the player picked.
            ctx.directives.push(GadgetDirectives.setIdleAnimation({
                'targetGadgets': deviceIds,
                'animations': BasicAnimations.SolidAnimation(1, characterColor, 2000)
            } ));


            //TODO get list of remaining
            let chosenCharacters = sessionAttributes.chosenCharacters;
            let availableCharacters = sessionAttributes.characterProperties.reduce(function(list, list_item) {
                    list.push(list_item.name);
                    return list;
                }, []
            ).filter(function(name) {
                return  chosenCharacters.indexOf(name) === -1;
            }).reduce(function(accumulator, name, index, list){
                if(index === list.length-1){
                    accumulator = accumulator + ", and " + name;
                }else if(index == 0){
                    accumulator = accumulator + name;
                }else{
                    accumulator = accumulator + ", " + name;
                }
                return accumulator;
            }, "");

            ctx.outputSpeech = ["Got it player " + currentPlayer + ". You are the "+gameCharacter+"."];
            ctx.outputSpeech.push("The characters remaining are. "+availableCharacters+".");
            ctx.outputSpeech.push("Player "+sessionAttributes.game.currentPlayer+", which character would you like?");
            ctx.outputSpeech.push(Settings.WAITING_AUDIO);

            ctx.openMicrophone = false;
            return handlerInput.responseBuilder.getResponse();
        }
    },
    HandleTimeout: function(handlerInput) {
        console.log("GamePlay::InputHandlerEvent::timeout");
        const {attributesManager} = handlerInput;
        const ctx = attributesManager.getRequestAttributes();
        const sessionAttributes = attributesManager.getSessionAttributes();    

        // The color the user chose
        const uColor = sessionAttributes.ColorChoice;
        ctx.outputSpeech = ["The input handler has timed out."];
        ctx.outputSpeech.push("That concludes our test, would you like to quit?");
        ctx.reprompt = ["Would you like to exit?"];
        ctx.reprompt.push("Say Yes to exit, or No to keep going");

        let deviceIds = sessionAttributes.DeviceIDs;
        deviceIds = deviceIds.slice(-2);
        // play a custom FadeOut animation, based on the user's selected color
        ctx.directives.push(GadgetDirectives.setIdleAnimation({ 
            'targetGadgets': deviceIds, 
            'animations': BasicAnimations.FadeOutAnimation(1, uColor, 2000) 
        }));
        // Reset button animation for skill exit
        ctx.directives.push(GadgetDirectives.setButtonDownAnimation(
            Settings.DEFAULT_ANIMATIONS.ButtonDown, {'targetGadgets': deviceIds } ));
        ctx.directives.push(GadgetDirectives.setButtonUpAnimation(
            Settings.DEFAULT_ANIMATIONS.ButtonUp, {'targetGadgets': deviceIds } ));
                
        // Set Skill End flag
        sessionAttributes.expectingEndSkillConfirmation = true;
        sessionAttributes.state = Settings.SKILL_STATES.EXIT_MODE;

        console.log('$$ session handlerInput events', handlerInput.requestEnvelope.request.events.inputEvents);
                            
        ctx.openMicrophone = true;
        return handlerInput.responseBuilder.getResponse();
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