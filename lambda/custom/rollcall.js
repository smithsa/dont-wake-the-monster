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


// Define some animations that we'll use during roll call, to be played in various situations,
// such as when buttons "check in" during roll call, or after both buttons were detected. 
// See: https://developer.amazon.com/docs/gadget-skills/control-echo-buttons.html#animate
const ROLL_CALL_ANIMATIONS = {
    'RollCallComplete': {
        'targetGadgets': [],
        'animations': BasicAnimations.FadeInAnimation(1, "white", 3000)
    },
    'ButtonCheckInIdle': {
        'targetGadgets': [],
        'animations': BasicAnimations.SolidAnimation(1, "blue", 8000)
    },
    'ButtonCheckInDown' : {
        'targetGadgets': [],
        'animations': BasicAnimations.SolidAnimation(1, "blue", 1000)
    },
    'ButtonCheckInUp': {
        'targetGadgets': [],
        'animations': BasicAnimations.SolidAnimation(1, "white", 4000)
    },
    'Timeout': {
        'targetGadgets': [],
        'animations': BasicAnimations.FadeAnimation("black", 1000)
    }
};

// Only one button is required so we will make one button recognizer object
const ROLL_CALL_RECOGNIZERS = {
    "roll_call_first_button_recognizer": {
        "type": "match",
        "fuzzy": false,
        "anchor": "end",
        "pattern": [{
                "gadgetIds": [ "first_button" ],
                "action": "down"
            }
        ]
    }
};

// Define named events based on the ROLL_CALL_RECOGNIZERS and the built-in "timed out" recognizer
// to report back to the skill when the first button checks in, when the second button checks in,
// as well as then the input handler times out, if this happens before two buttons checked in. 
// see: https://developer.amazon.com/docs/gadget-skills/define-echo-button-events.html#define
const ROLL_CALL_EVENTS = {
    "button_checked_in": {
        "meets": ["roll_call_first_button_recognizer"],
        "reports": "matches",
        "shouldEndInputHandler": true,
        "maximumInvocations": 1
    },
    "timeout": {
        "meets": ["timed out"],
        "reports": "history",
        "shouldEndInputHandler": true
    }
};


// ***********************************************************************
//   ROLL_CALL_MODE Handlers
//     set up handlers for events that are specific to the Roll Call mode
// ***********************************************************************
const RollCall = {
    NewSession: function(handlerInput) {
        console.log("RollCall::NewSession");

        const ctx = handlerInput.attributesManager.getRequestAttributes();
        ctx.outputSpeech = [ctx.t('WELCOME_MESSAGE', ctx.t('GREETING'), ctx.t('SKILL_NAME'))];
        ctx.outputSpeech.push(ctx.t('ROLL_CALL_INSTRUCTION'));
        ctx.outputSpeech.push(Settings.WAITING_AUDIO);

        ctx.timeout = 50000;

        ctx.openMicrophone = true;
        return RollCall.StartRollCall(handlerInput);
    },
    StartRollCall: function(handlerInput) {
        console.log("RollCall::StartRollCall");
        const { attributesManager } = handlerInput;        
        const ctx = attributesManager.getRequestAttributes();
        const sessionAttributes = attributesManager.getSessionAttributes();
 
        console.log("RollCall::StartRollCall -> timeout = " + ctx.timeout);
        // add a StartInputHandler directive using the ROLL_CALL recognizers and events
        ctx.directives.push(GadgetDirectives.startInputHandler({ 
            'timeout': ctx.timeout, 
            'proxies': ['first_button'],
            'recognizers': ROLL_CALL_RECOGNIZERS, 
            'events': ROLL_CALL_EVENTS 
        }));

        ctx.directives.push(GadgetDirectives.setButtonDownAnimation(
            ROLL_CALL_ANIMATIONS.ButtonCheckInDown));
        ctx.directives.push(GadgetDirectives.setButtonUpAnimation(
            ROLL_CALL_ANIMATIONS.ButtonCheckInUp));
 
        // start keeping track of some state
        sessionAttributes.state = Settings.SKILL_STATES.ROLL_CALL_MODE;
        sessionAttributes.buttonCount = 0;
        sessionAttributes.isRollCallComplete = false;
        sessionAttributes.expectingEndSkillConfirmation = false;
        // setup an array of DeviceIDs to hold IDs of buttons that will be used in the skill
        sessionAttributes.DeviceIDs = [];

        // Games variables

        // Save StartInput Request ID
        sessionAttributes.CurrentInputHandlerID = handlerInput.requestEnvelope.request.requestId;
        sessionAttributes.StepInputHandlerID = null;

        ctx.openMicrophone = false;
        return handlerInput.responseBuilder.getResponse();
    },

    HandleButtonCheckIn: function(handlerInput) {
        console.log("RollCall::InputHandlerEvent:: button_checked_in");
        const {attributesManager} = handlerInput;
        const ctx = attributesManager.getRequestAttributes();
        const sessionAttributes = attributesManager.getSessionAttributes();

        console.log("RollCall:: request attributes  = " + JSON.stringify(ctx, null, 2));

        // just in case we ever get this event, after the `second_button_checked_in` event
        //  was already handled, we check the make sure the `buttonCount` attribute is set to 0;
        //   if not, we will silently ignore the event
        if (sessionAttributes.buttonCount === 0) {
            let fistButtonId = ctx.gameInputEvents[0].gadgetId;
            ctx.directives.push(GadgetDirectives.setIdleAnimation(
                ROLL_CALL_ANIMATIONS.RollCallComplete, { 'targetGadgets': [fistButtonId] } ));

            sessionAttributes.DeviceIDs[0] = fistButtonId;
            sessionAttributes.buttonCount = 1;
        }

        //setting up the game variables
        sessionAttributes.game = Settings.GAME;
        sessionAttributes.characterProperties = [
            {'name': ctx.t('CHARACTER_ONE'), 'color': ctx.t('CHARACTER_ONE_COLOR')},
            {'name': ctx.t('CHARACTER_TWO'), 'color': ctx.t('CHARACTER_TWO_COLOR')},
            {'name': ctx.t('CHARACTER_THREE'), 'color': ctx.t('CHARACTER_THREE_COLOR')},
            {'name': ctx.t('CHARACTER_FOUR'), 'color': ctx.t('CHARACTER_FOUR_COLOR')}
        ];
        sessionAttributes.chosenCharacters = [];

        ctx.reprompt = [ctx.t('NUM_PLAYERS_REPROMPT')];
        ctx.outputSpeech = [];
        ctx.outputSpeech.push(ctx.t('ROLL_CALL_CONFIRMATION'));
        ctx.outputSpeech.push(ctx.reprompt[0]);

        sessionAttributes.isRollCallComplete = true;
        sessionAttributes.state = Settings.SKILL_STATES.PLAYER_COUNT_MODE;

        ctx.openMicrophone = true;
        return handlerInput.responseBuilder.getResponse();
    }
};

module.exports = RollCall;