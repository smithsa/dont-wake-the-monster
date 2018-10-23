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
//helper functions
const HelperFunctions = require('util/helper.js');
// Basic Animation Helper Library
const BasicAnimations = require('button_animations/basicAnimations.js');
// import the skill settings constants 
const Settings = require('settings.js');

const RollCall = require('rollcall.js');
const GamePlay = require('gameplay.js');

//import libraries for using sprintf for localization
const i18n = require('i18next');
const sprintf = require('i18next-sprintf-postprocessor');

//DynamoDb Memory Persistence
const { DynamoDbPersistenceAdapter } = require('ask-sdk-dynamodb-persistence-adapter');
const dynamoDbPersistenceAdapter = new DynamoDbPersistenceAdapter({ tableName : 'dont_wake_the_monster_session_data', createTable: true });

const languageStrings = {
    'en' : require('./i18n/en'),
    'de' : require('./i18n/de')
}

const ROLL_CALL_ANIMATIONS = {
    'RollCallComplete': {
        'targetGadgets': [],
        'animations': BasicAnimations.FadeInAnimation(1, "green", 5000)
    },
    'ButtonCheckInIdle': {
        'targetGadgets': [],
        'animations': BasicAnimations.SolidAnimation(1, "green", 8000)
    },
    'ButtonCheckInDown' : {
        'targetGadgets': [],
        'animations': BasicAnimations.SolidAnimation(1, "green", 1000)
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



// Define a recognizer for button down events that will match when any button is pressed down.
// We'll use this recognizer as trigger source for the "button_down_event" during play
// see: https://developer.amazon.com/docs/gadget-skills/define-echo-button-events.html#recognizers

let skill;
 
exports.handler = function (event, context) {
     // Prints Alexa Event Request to CloudWatch logs for easier debugging
     console.log(`===EVENT===${JSON.stringify(event)}`);
     if (!skill) {
     skill = Alexa.SkillBuilders.custom()

         .addRequestHandlers(
             GlobalHandlers.LaunchRequestHandler,
             GlobalHandlers.GameEngineInputHandler,
             GlobalHandlers.HelpIntentHandler,
             GlobalHandlers.StopIntentHandler,
             GlobalHandlers.YesIntentHandler,
             GlobalHandlers.NoIntentHandler,
             GlobalHandlers.PassIntentHandler,
             GlobalHandlers.GoIntentHandler,
             GlobalHandlers.SessionEndedRequestHandler,
             GlobalHandlers.DefaultHandler
         )
         .withPersistenceAdapter(dynamoDbPersistenceAdapter)
         .addRequestInterceptors(LocalizationInterceptor)
         .addRequestInterceptors(GlobalHandlers.RequestInterceptor)
         .addResponseInterceptors(GlobalHandlers.ResponseInterceptor)
         .addErrorHandlers(GlobalHandlers.ErrorHandler)
         .create();
     }

     return skill.invoke(event,context);
 }

// ***********************************************************************
//   Global Handlers
//     set up some handlers for events that will have to be handled
//     regardless of what state the skill is in
// ***********************************************************************
const GlobalHandlers = {
    LaunchRequestHandler: {
        canHandle(handlerInput) {
            let { request } = handlerInput.requestEnvelope;
            console.log("LaunchRequestHandler: checking if it can handle " + request.type);
            return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
        },
        handle(handlerInput) {
            console.log("LaunchRequestHandler: handling request");

            //TODO Create the play again that calls this
            const { attributesManager } = handlerInput;
            const sessionAttributes = attributesManager.getSessionAttributes();

            //TODO return a new game message. Reset the variables and ask the first player to go again
            if(sessionAttributes.hasOwnProperty('state')){
                sessionAttributes.state = Settings.SKILL_STATES.PLAY_MODE;
                sessionAttributes.game.currentPlayer = 1;
                sessionAttributes.game.gameBoardPointer = 0;
                sessionAttributes.game.turnScore = 0;
                sessionAttributes.replayCount = (sessionAttributes.hasOwnProperty('replayCount') ? sessionAttributes.replayCount + 1 : 1);
                //reset scores
                let scores = sessionAttributes.game.overallScore;
                for(let key in scores){
                    if(scores.hasOwnProperty(key)){
                        sessionAttributes.game.overallScore[key] = 0;
                    }
                }

                //resetting items that need to be updated
                sessionAttributes.game.trapsTriggered = 0;

                //setting up board again
                let gameBoardCount = Settings.GAME.gameBoard + HelperFunctions.getRandomInteger(0,2);
                let beanCount = Settings.GAME.beansCount + HelperFunctions.getRandomInteger(0,1);
                sessionAttributes.game.gameBoard = gameBoardCount;
                sessionAttributes.game.mines = HelperFunctions.getUniqueRandomIntegers(Settings.GAME.mineCount, gameBoardCount - 1);
                sessionAttributes.game.beans = HelperFunctions.getUniqueRandomIntegersWithRestrictions(beanCount, gameBoardCount - 1, sessionAttributes.game.mines);
                return handlerInput.responseBuilder
                    .speak('Okay. Let\'s play again. You know the drill. Try to collect as many beans as possible without waking the sleeping monster. Remember, there are traps and the third trap will wake the monster. Player with the most beans when the monster wakes up is the winner. Player one, would you like to go or skip?')
                    .getResponse();
            }else{
                sessionAttributes.game =  Settings.GAME;
                let gameBoardCount = Settings.GAME.gameBoard + HelperFunctions.getRandomInteger(0,2);
                let beanCount = Settings.GAME.beansCount + HelperFunctions.getRandomInteger(0,1);
                sessionAttributes.game.gameBoard = gameBoardCount;
                sessionAttributes.game.mines = HelperFunctions.getUniqueRandomIntegers(Settings.GAME.mineCount, gameBoardCount - 1);
                sessionAttributes.game.beans = HelperFunctions.getUniqueRandomIntegersWithRestrictions(beanCount, gameBoardCount - 1, sessionAttributes.game.mines);
                return RollCall.NewSession(handlerInput);
            }

        }
    },
    ErrorHandler: {
        canHandle(handlerInput, error) {
            let { request } = handlerInput.requestEnvelope;
            console.log("Global.ErrorHandler: checking if it can handle " 
                + request.type + ": [" + error.name + "] -> " + !!error.name);
            return !!error.name;     //error.name.startsWith('AskSdk');
        },
        handle(handlerInput, error) {
            console.log("Global.ErrorHandler: error = " + error.message);

            return handlerInput.responseBuilder
                .speak('An error was encountered while handling your request. Try again later')
                .getResponse();
        }
    },
    HelpIntentHandler: {
        canHandle(handlerInput) {
            const { request } = handlerInput.requestEnvelope;
            const intentName = request.intent ? request.intent.name : '';
            console.log("Global.HelpIntentHandler: checking if it can handle " 
                + request.type + " for " + intentName);
            return request.type === 'IntentRequest'
                && intentName === 'AMAZON.HelpIntent';
        },
        handle(handlerInput) {
            console.log("Global.HelpIntentHandler: handling request for help");

            const { attributesManager } = handlerInput;
            const sessionAttributes = attributesManager.getSessionAttributes();
            const ctx = attributesManager.getRequestAttributes();

            if (sessionAttributes.CurrentInputHandlerID) {
                // if there is an active input handler, stop it so it doesn't interrup Alexa speaking the Help prompt
                // see: https://developer.amazon.com/docs/gadget-skills/receive-echo-button-events.html#stop
                ctx.directives.push(GadgetDirectives.stopInputHandler({ 
                    'id': sessionAttributes.CurrentInputHandlerID
                }));
            }

            let reprompt = "", 
                outputSpeech = "";

            console.log('Session State: ', sessionAttributes.state);
            if(sessionAttributes.state === Settings.SKILL_STATES.ROLL_CALL_MODE){
                if (sessionAttributes.isRollCallComplete === true) {
                    // roll call is complete
                    ctx.reprompt = ["Pick a color to test your buttons: red, blue, or green. "];
                    ctx.reprompt.push(ctx.t('EXIT_HELP_INSTRUCTION'));

                    ctx.outputSpeech = ["Now that you have registered a button, "];
                    ctx.outputSpeech.push("Tell me how many players there are. ");
                    ctx.outputSpeech.push("Two to four players can play this game. ");
                    ctx.outputSpeech.push("If you do not wish to continue, you can say exit. ");
                    return handlerInput.responseBuilder.getResponse();

                } else if(sessionAttributes.isRollCallComplete === false) {
                    // the user hasn't yet completed roll call
                    ctx.reprompt = [ctx.t('HELP_ROLL_CALL_INCOMPLETE_REPROMPT')];
                    ctx.outputSpeech = [ctx.t('HELP_ROLL_CALL_INCOMPLETE_1')];
                    ctx.outputSpeech.push(ctx.t('HELP_ROLL_CALL_INCOMPLETE_2'));
                    ctx.outputSpeech.push(ctx.t('HELP_ROLL_CALL_INCOMPLETE_3'));

                    sessionAttributes.expectingEndSkillConfirmation = true;
                }
            }
            else if(sessionAttributes.state === Settings.SKILL_STATES.PLAYER_COUNT_MODE){
                console.log('HELP --> PLAYER_COUNT_MODE');
                ctx.outputSpeech = [ctx.t('TIMEOUT_PLAYER_COUNT')];
            }
            else if(sessionAttributes.state === Settings.SKILL_STATES.CHOOSE_CHARACTER_MODE){
                console.log('HELP --> CHOOSE_CHARACTER_MODE');
                let chosenCharacters = sessionAttributes.chosenCharacters;
                let charactersList = sessionAttributes.characterProperties.reduce(function(list, list_item) {
                        list.push(list_item.name);
                        return list;
                    }, []
                );
                let availableCharactersStringBeforePick = HelperFunctions.getRemainingCharacterNames(chosenCharacters, charactersList);
                ctx.outputSpeech = [ctx.t('TIMEOUT_CHOOSE_CHARACTER', availableCharactersStringBeforePick)];            }
            else if(sessionAttributes.state === Settings.SKILL_STATES.PLAY_MODE){
                console.log('HELP --> PLAY_MODE');
                ctx.outputSpeech = [ctx.t('HELP_PLAY_GAME', sessionAttributes.game.currentPlayer)];
            }
            else if(sessionAttributes.state === Settings.SKILL_STATES.PLAY_AGAIN_MODE){
                console.log('HELP --> PLAY_AGAIN_MODE');
                ctx.outputSpeech = [ctx.t('HELP_PLAY_AGAIN_INSTRUCTIONS')];
            }
            else if(sessionAttributes.state === Settings.SKILL_STATES.END_GAME_MODE){
                console.log('HELP --> END_GAME_MODE');
                ctx.outputSpeech = [ctx.t('HELP_END_GAME_MODE')];
            }

            return handlerInput.responseBuilder.getResponse();

        }
    },
    StopIntentHandler: {
        canHandle(handlerInput) {
            const { request } = handlerInput.requestEnvelope;
            const intentName = request.intent ? request.intent.name : '';
                    
            console.log("Global.StopIntentHandler: checking if it can handle " 
                + request.type + " for " + intentName);
            return request.type === 'IntentRequest'
                && intentName === 'AMAZON.StopIntent' || intentName === 'AMAZON.CancelIntent';
        },
        handle(handlerInput) {
            let { attributesManager } = handlerInput;
            const ctx = attributesManager.getRequestAttributes();
            console.log("Global.StopIntentHandler: handling request");
            console.log('EXIT AUDIO', Settings.EXIT_AUDIO);
            handlerInput.responseBuilder.speak(ctx.t('EXIT_MESSAGE', Settings.EXIT_AUDIO));
            return GlobalHandlers.SessionEndedRequestHandler.handle(handlerInput);
        }
    },
    GoIntentHandler: {
        canHandle(handlerInput) {
            let { request } = handlerInput.requestEnvelope;
            console.log("Global.GoIntentHandler: checking if it can handle "
                + request.type);
            return request.type === 'goIntent';
        },
        handle(handlerInput) {
            const { attributesManager } = handlerInput;
            const sessionAttributes = attributesManager.getSessionAttributes();
            const ctx = attributesManager.getRequestAttributes();

            let gameCharacter = sessionAttributes.game.playerCharacter["player"+sessionAttributes.game.currentPlayer];
            let characterColor = sessionAttributes.characterProperties.find(function (item) {
                return item.name === gameCharacter;
            });

            characterColor = characterColor.color;
            let deviceIds = sessionAttributes.DeviceIDs;
            // Save Input Handler Request ID

            ctx.directives.push(GadgetDirectives.setIdleAnimation({
                'targetGadgets': deviceIds,
                'animations': BasicAnimations.FadeInAnimation(2, characterColor, 3000)
            } ));

            if(sessionAttributes.state = Settings.SKILL_STATES.PLAY_MODE){
                return GamePlay.incrementStepIntentHandler(handlerInput);
            }

            return GlobalHandlers.HelpIntentHandler.handle(handlerInput);
        }
    },
    PassIntentHandler: {
        canHandle(handlerInput) {
            let { request } = handlerInput.requestEnvelope;
            console.log("Global.PassIntentHandler: checking if it can handle "
                + request.type);
            return request.type === 'passIntent';
        },
        handle(handlerInput) {
            const { attributesManager } = handlerInput;
            const sessionAttributes = attributesManager.getSessionAttributes();
            const ctx = attributesManager.getRequestAttributes();
            ctx.openMicrophone = true;

            let gameCharacter = sessionAttributes.game.playerCharacter["player"+sessionAttributes.game.currentPlayer];
            let characterColor = sessionAttributes.characterProperties.find(function (item) {
                return item.name === gameCharacter;
            });

            characterColor = characterColor.color;
            let deviceIds = sessionAttributes.DeviceIDs;
            // Save Input Handler Request ID

            ctx.directives.push(GadgetDirectives.setIdleAnimation({
                'targetGadgets': deviceIds,
                'animations': BasicAnimations.FadeInAnimation(2, characterColor, 3000)
            } ));


            if(sessionAttributes.state = Settings.SKILL_STATES.PLAY_MODE){
                let currentPLayerNumber = parseInt(sessionAttributes.game.currentPlayer);

                ctx.outputSpeech = ["Skipping player "+currentPLayerNumber+"."];

                sessionAttributes.game.currentPlayer = currentPLayerNumber+1;
                if(currentPLayerNumber == parseInt(sessionAttributes.game.playerCount)){
                    sessionAttributes.game.currentPlayer = 1;
                }

                ctx.outputSpeech.push("Player "+sessionAttributes.game.currentPlayer+", would you like to go, or skip?");
                return handlerInput.responseBuilder.getResponse();
            }

            return GlobalHandlers.HelpIntentHandler.handle(handlerInput);

        }
    },
    GameEngineInputHandler: {
        canHandle(handlerInput) {
            let { request } = handlerInput.requestEnvelope;
            console.log("Global.GameEngineInputHandler: checking if it can handle " 
                + request.type);
            return request.type === 'GameEngine.InputHandlerEvent';
        },
        handle(handlerInput) { 
            let { attributesManager } = handlerInput;
            let request = handlerInput.requestEnvelope.request;
            const sessionAttributes = attributesManager.getSessionAttributes();
            const ctx = attributesManager.getRequestAttributes();
            if (request.originatingRequestId !== sessionAttributes.CurrentInputHandlerID) {
                console.log("Global.GameEngineInputHandler: stale input event received -> " 
                           +"received event from " + request.originatingRequestId 
                           +" (was expecting " + sessionAttributes.CurrentInputHandlerID + ")");
                ctx.openMicrophone = false;
                return handlerInput.responseBuilder.getResponse();
            }

            var gameEngineEvents = request.events || [];
            for (var i = 0; i < gameEngineEvents.length; i++) {
                // In this request type, we'll see one or more incoming events
                // that correspond to the StartInputHandler we sent above.
                switch (gameEngineEvents[i].name) {
                    case 'button_checked_in':
                        ctx.gameInputEvents = gameEngineEvents[i].inputEvents;
                        return RollCall.HandleButtonCheckIn(handlerInput);
                    case 'step_event':
                        console.log('GADGET DIRECTIVE TRIGGER: step_event');
                        if (sessionAttributes.state == Settings.SKILL_STATES.PLAY_MODE) {
                            return GamePlay.HandleButtonStepped(handlerInput);
                        }
                        break;
                    case 'timeout':
                        console.log('GADGET DIRECTIVE TRIGGER: timeout');
                        if (sessionAttributes.state == Settings.SKILL_STATES.PLAY_MODE) {
                            console.log('GADGET DIRECTIVE TRIGGER: timeout from game');
                            return GlobalHandlers.HandleTimeout(handlerInput);
                        }

                        break;
                }
            }
            return handlerInput.responseBuilder.getResponse();
        }
    },
    YesIntentHandler: {
        canHandle(handlerInput) {
            let { request } = handlerInput.requestEnvelope;
            let intentName = request.intent ? request.intent.name : '';
            console.log("Global.YesIntentHandler: checking if it can handle " 
                + request.type + " for " + intentName);
            return request.type === 'IntentRequest'
                && intentName === 'AMAZON.YesIntent';
        },
        handle(handlerInput) {
            console.log("Global.YesIntentHandler: handling request");
            let { attributesManager } = handlerInput;         
            const sessionAttributes = attributesManager.getSessionAttributes();
            const ctx = attributesManager.getRequestAttributes();
            const state = sessionAttributes.state || '';
            //TODO for all places where user says yes make sure I check
            if (state === Settings.SKILL_STATES.ROLL_CALL_MODE
                && sessionAttributes.expectingEndSkillConfirmation === true) {
                ctx.outputSpeech = [ctx.t('SECOND_THOUGHT_REGISTER_BUTTON')];
                ctx.outputSpeech.push(Settings.WAITING_AUDIO);
                ctx.timeout = 30000;
                return RollCall.StartRollCall(handlerInput);
            }
            else if(state === Settings.SKILL_STATES.END_GAME_MODE){
                return GlobalHandlers.LaunchRequestHandler.handle(handlerInput);
            }
            else if (state === Settings.SKILL_STATES.EXIT_MODE
                && sessionAttributes.expectingEndSkillConfirmation === true) {
                return GlobalHandlers.SessionEndedRequestHandler.handle(handlerInput);                                
            } else if (state === Settings.SKILL_STATES.EXIT_MODE) {
                // ---- Hanlde "Yes", if we're in EXIT_MODE, but not expecting exit confirmation
                return GlobalHandlers.DefaultHandler.handle(handlerInput);
            } else {
                // ---- Hanlde "Yes" in other cases .. just fall back on the help intent
                return GlobalHandlers.HelpIntentHandler.handle(handlerInput);
            }
        }
    },
    NoIntentHandler: {
        canHandle(handlerInput) {
            let { request } = handlerInput.requestEnvelope;
            let intentName = request.intent ? request.intent.name : '';
            console.log("Global.NoIntentHandler: checking if it can handle " 
                + request.type + " for " + intentName);
            return request.type === 'IntentRequest'
                && intentName === 'AMAZON.NoIntent';
        },
        handle(handlerInput) {
            console.log("Global.NoIntentHandler: handling request");
            let { attributesManager } = handlerInput;
            const sessionAttributes = attributesManager.getSessionAttributes();
            const ctx = attributesManager.getRequestAttributes();
            const state = sessionAttributes.state || '';

            // ---- Hanlde "No" when we're in the context of Roll Call ...
            if (state === Settings.SKILL_STATES.ROLL_CALL_MODE 
                && sessionAttributes.expectingEndSkillConfirmation === true) {
                // if user says No when prompted whether they will to continue with rollcall then just exit
                return GlobalHandlers.StopIntentHandler.handle(handlerInput);
            }
            else if(state === Settings.SKILL_STATES.END_GAME_MODE){
                return GlobalHandlers.StopIntentHandler.handle(handlerInput);
            }
            else if (state === Settings.SKILL_STATES.EXIT_MODE
                && sessionAttributes.expectingEndSkillConfirmation === true) { 
                ctx.reprompt = ["Tell me how many players are playing the game."];
                ctx.outputSpeech = ["Ok, let's keep going."];
                ctx.outputSpeech.push(ctx.reprompt);
                ctx.openMicrophone = true;
                sessionAttributes.state = Settings.SKILL_STATES.PLAY_MODE;
                return handlerInput.responseBuilder.getResponse();
            } else if (state === Settings.SKILL_STATES.EXIT_MODE) {
                // ---- Hanlde "No" in other cases .. just fall back on the help intent
                return GlobalHandlers.DefaultHandler.handle(handlerInput);
            } else {
                // ---- Hanlde "No" in other cases .. just fall back on the help intent
                return GlobalHandlers.HelpIntentHandler.handle(handlerInput);
            }
        }
    },
    HandleTimeout: function(handlerInput) {

    console.log("rollCallModeIntentHandlers::InputHandlerEvent::timeout");
    const {attributesManager} = handlerInput;
    const ctx = attributesManager.getRequestAttributes();
    const sessionAttributes = attributesManager.getSessionAttributes();
    sessionAttributes.expectingEndSkillConfirmation = false;
    ctx.openMicrophone = true;

    if(sessionAttributes.state == Settings.SKILL_STATES.ROLL_CALL_MODE){
        console.log('TIMEOUT:', 'ROLL_CALL_MODE');
        ctx.outputSpeech = [ctx.t('TIMEOUT_ROLL_CALL')];
        sessionAttributes.expectingEndSkillConfirmation = true;
    }else if(sessionAttributes.state == Settings.SKILL_STATES.PLAY_MODE){
        console.log('TIMEOUT:', 'PLAYMODE GADGET');
        const {attributesManager} = handlerInput;
        const ctx = attributesManager.getRequestAttributes();
        let deviceIds = sessionAttributes.DeviceIDs;
        sessionAttributes.game.isStartOfTurn = true;

        ctx.outputSpeech = [ctx.t('TIMEOUT_PLAY_MODE')];


        if(sessionAttributes.game.turnScore > 0){
            ctx.outputSpeech.push('Great job! You gained '+sessionAttributes.game.turnScore+' points.');
        }

        let playerScoreKey = "player";
        playerScoreKey += (sessionAttributes.game.currentPlayer == 1 ? sessionAttributes.game.playerCount : parseInt(sessionAttributes.game.currentPlayer) - 1);

        let beanNumber = sessionAttributes.game['overallScore'][playerScoreKey];
        let beanSingularPlural = (beanNumber === 1) ? 'bean' : 'beans';
        ctx.outputSpeech.push(ctx.t('BEAN_TOTAL', beanNumber, beanSingularPlural));

        ctx.outputSpeech.push(ctx.t('PASS_OR_GO', sessionAttributes.game.currentPlayer));

        //TODO give result, ask next user if they want to go or pass
        return handlerInput.responseBuilder.getResponse();
    }else{//the quit mode
        return GlobalHandlers.StopIntentHandler;
    }


    let deviceIds = sessionAttributes.DeviceIDs;

    ctx.directives.push(GadgetDirectives.setIdleAnimation(
        ROLL_CALL_ANIMATIONS.Timeout, { 'targetGadgets': deviceIds } ));
    ctx.directives.push(GadgetDirectives.setButtonDownAnimation(
        Settings.DEFAULT_ANIMATIONS.ButtonDown, { 'targetGadgets': deviceIds } ));
    ctx.directives.push(GadgetDirectives.setButtonUpAnimation(
        Settings.DEFAULT_ANIMATIONS.ButtonUp, { 'targetGadgets': deviceIds } ));

    return handlerInput.responseBuilder.getResponse();
},
DefaultHandler: {
        canHandle(handlerInput) {
            let { request } = handlerInput.requestEnvelope;
            let intentName = request.intent ? request.intent.name : '';
            console.log("Global.DefaultHandler: checking if it can handle " 
                + request.type + " for " + intentName);
            return true;
        },
        handle(handlerInput) {
            //TODO return intents based on game mode
            let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
            console.log("Global.DefaultHandler: handling request. In default handler");
            if (handlerInput.requestEnvelope.request.type === 'IntentRequest'
                && handlerInput.requestEnvelope.request.intent.name === 'addPlayersIntent') {
                if(sessionAttributes.state == Settings.SKILL_STATES.CHOOSE_CHARACTER_MODE){
                    return GamePlay.ChooseCharacterIntentHandler(handlerInput);
                }
                return GamePlay.AddPlayersIntentHandler(handlerInput);
            }
            else if (handlerInput.requestEnvelope.request.type === 'IntentRequest'
                && handlerInput.requestEnvelope.request.intent.name === 'chooseCharacterIntent') {
                return GamePlay.ChooseCharacterIntentHandler(handlerInput);
            }
            else if (handlerInput.requestEnvelope.request.type === 'IntentRequest'
                && handlerInput.requestEnvelope.request.intent.name === 'goIntent') {
                return GlobalHandlers.GoIntentHandler.handle(handlerInput);
            }
            else if (handlerInput.requestEnvelope.request.type === 'IntentRequest'
                && handlerInput.requestEnvelope.request.intent.name === 'passIntent') {
                return GlobalHandlers.PassIntentHandler.handle(handlerInput);
            }
            else{
                return GlobalHandlers.HelpIntentHandler.handle(handlerInput);
            }

            const ctx = handlerInput.attributesManager.getRequestAttributes();
 
            // otherwise, try to let the user know that we couldn't understand the request 
            //  and prompt for what to do next
            ctx.reprompt = [ctx.t('HELP_PROMPT')];
            ctx.outputSpeech = [ctx.t('HELP_SYMPATHY') + ctx.reprompt[0]];
            
            ctx.openMicrophone = true;        
            return handlerInput.responseBuilder.getResponse();
        }
    },
    SessionEndedRequestHandler: {
        canHandle(handlerInput) {
            return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
        },
        handle(handlerInput) {
            console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);
            let response = handlerInput.responseBuilder.getResponse();
            response.shouldEndSession = true;
            const ctx = handlerInput.attributesManager.getRequestAttributes();
            ctx.outputSpeech = [ctx.t('EXIT_MESSAGE', Settings.EXIT_AUDIO)];
            return handlerInput.responseBuilder.getResponse();
        },
    },
    RequestInterceptor: {
        process(handlerInput) {  
            console.log("Global.RequestInterceptor: pre-processing response");
            let {attributesManager, responseBuilder} = handlerInput;
            let ctx = attributesManager.getRequestAttributes();
            ctx.directives = [];
            ctx.outputSpeech = [];
            ctx.reprompt = [];
            console.log("Global.RequestInterceptor: pre-processing response complete");
        }
    },
    ResponseInterceptor: {
        process(handlerInput) {        
            let {attributesManager, responseBuilder} = handlerInput;                        
            const ctx = attributesManager.getRequestAttributes();   
            console.log("Global.ResponseInterceptor: post-processing response " + JSON.stringify(ctx)); 
            
            if (ctx.outputSpeech.length > 0) {                
                let outputSpeech = ctx.outputSpeech.join(' ');
                console.log("Global.ResponseInterceptor: adding " 
                    + ctx.outputSpeech.length + " speech parts"); 
                responseBuilder.speak(outputSpeech);
            }
            if (ctx.reprompt.length > 0) {         
                console.log("Global.ResponseInterceptor: adding " 
                    + ctx.outputSpeech.length + " speech reprompt parts");        
                let reprompt = ctx.reprompt.join(' ');
                responseBuilder.reprompt(reprompt);
            }
            let response = responseBuilder.getResponse();
            
            if ('openMicrophone' in ctx) {
                if (ctx.openMicrophone) {
                    // setting shouldEndSession = fase  -  lets Alexa know that we want an answer from the user 
                    // see: https://developer.amazon.com/docs/gadget-skills/receive-voice-input.html#open
                    //      https://developer.amazon.com/docs/gadget-skills/keep-session-open.html
                    response.shouldEndSession = false;
                    console.log("Global.ResponseInterceptor: request to open microphone -> shouldEndSession = false"); 
                } else {
                    // deleting shouldEndSession will keep the skill session going, 
                    //  while the input handler is active, waiting for button presses
                    // see: https://developer.amazon.com/docs/gadget-skills/keep-session-open.html
                    delete response.shouldEndSession;
                    console.log("Global.ResponseInterceptor: request to open microphone -> delete shouldEndSession"); 
                }
            }

            if (Array.isArray(ctx.directives)) {   
                console.log("Global.ResponseInterceptor: processing " + ctx.directives.length + " custom directives ");
                response.directives = response.directives || [];
                for (let i = 0; i < ctx.directives.length; i++) {
                    response.directives.push(ctx.directives[i]);
                }
            }

            console.log(`==Response==${JSON.stringify(response)}`);
            console.log(`==SessionAttributes==${JSON.stringify(attributesManager.getSessionAttributes())}`);

            return response;
            //return new Promise((resolve, reject) => {
            //    handlerInput.attributesManager.savePersistentAttributes()
            //        .then(() => {
            //            resolve();
            //        })
            //        .catch((error) => {
            //            reject(error);
            //        });
            //});
        }
    }
};


/*
* Used for skill localization
*/
const LocalizationInterceptor = {
    process(handlerInput) {
        const localizationClient = i18n.use(sprintf).init({
            lng: handlerInput.requestEnvelope.request.locale,
            fallbackLng: 'en', // fallback to EN if locale doesn't exist
            resources: languageStrings
        });

        localizationClient.localize = function () {
            const args = arguments;
            let values = [];

            for (var i = 1; i < args.length; i++) {
                values.push(args[i]);
            }
            const value = i18n.t(args[0], {
                returnObjects: true,
                postProcess: 'sprintf',
                sprintf: values
            });

            if (Array.isArray(value)) {
                return value[Math.floor(Math.random() * value.length)];
            } else {
                return value;
            }
        }

        const attributes = handlerInput.attributesManager.getRequestAttributes();
        attributes.t = function (...args) { // pass on arguments to the localizationClient
            return localizationClient.localize(...args);
        };
    },
};