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

// Gadget Directives Builder
const GadgetDirectives = require('util/gadgetDirectives.js');
// Basic Animation Helper Library
const BasicAnimations = require('button_animations/basicAnimations.js');

module.exports = {
    // The skill states are the different parts of the skill.
    SKILL_STATES: {
        // Roll Call mode performs roll call and button registration.
        // https://developer.amazon.com/docs/gadget-skills/discover-echo-buttons.html
        ROLL_CALL_MODE: '_ROLL_CALL_MODE',
        CHOOSE_CHARACTER_MODE: '_CHOOSE_CHARACTER_MODE',
        PLAYER_COUNT_MODE: '_PLAYER_COUNT_MODE',
        PLAY_MODE: '_PLAY_MODE',
        // Exit mode performs the actions described in
        // https://developer.amazon.com/docs/gadget-skills/exit-echo-button-skill.html
        EXIT_MODE: '_EXIT_MODE',
        END_GAME_MODE: '_END_GAME_MODE',
        PLAY_AGAIN_MODE: '_PLAY_AGAIN_MODE',
    },

    // We'll use an audio sample of a ticking clock to play whenever the skill is waiting for button presses
    // This is an audio file from the ASK Soundbank: https://developer.amazon.com/docs/custom-skills/foley-sounds.html
    WAITING_AUDIO: '<audio src="https://s3.amazonaws.com/ask-soundlibrary/foley/amzn_sfx_rhythmic_ticking_30s_01.mp3"/>',
    STEP_AUDIO: '<audio src="soundbank://soundlibrary/cartoon/amzn_sfx_boing_short_1x_01" />',
    BEAN_AUDIO: '<audio src=\'soundbank://soundlibrary/ui/gameshow/amzn_ui_sfx_gameshow_positive_response_02\'/>',
    TRAP_AUDIO: '<audio src=\'soundbank://soundlibrary/ui/gameshow/amzn_ui_sfx_gameshow_negative_response_02\'/>',
    DRAMA_AUDIO: '<audio src="https://s3.us-east-2.amazonaws.com/dontwakethemonster/dundundunnnnn.mp3"/>',
    GROWL_AUDIO: '<audio src="https://s3.us-east-2.amazonaws.com/dontwakethemonster/growl.mp3"/>',
    ROAR_AUDIO: '<audio src="https://s3.us-east-2.amazonaws.com/dontwakethemonster/monster-roar.mp3"/>',
    EXIT_AUDIO: '<audio src=\'soundbank://soundlibrary/ui/gameshow/amzn_ui_sfx_gameshow_outro_01\'/>',

    // We'll set up a map of custom colors to each of the three allowed colord: blue, green and red
    BREATH_CUSTOM_COLORS: { 
        'blue': '184066',
        'green': '184518',
        'red': '603018',
        'black': '000000',
        'white': 'ffffff',
        'orange': 'e67e22',
        'purple': '8e44ad',
    },

    // Define animations to be played on button down and button up that are like the default animations on the buttons
    // We'll use these animations when resetting play state
    // See: https://developer.amazon.com/docs/gadget-skills/control-echo-buttons.html#animate
    DEFAULT_ANIMATIONS: {
        'ButtonDown' : {
            'targetGadgets': [],
            'animations': BasicAnimations.FadeOutAnimation(1, 'blue', 200)
        },
        'ButtonUp': {                     
            'targetGadgets': [], 
            'animations': BasicAnimations.SolidAnimation(1, 'black', 100)
        }
    },
    GAME:{
        'isStartOfTurn': false,
        'playerCount': 0,
        'stepsAllowed': 3,
        'overallScore': {
            'player1': 0,
            'player2': 0,
            'player3': 0,
            'player4': 0
        },
        'playerCharacter': {
            'player1': '',
            'player2': '',
            'player3': '',
            'player4': ''
        },
        'gameBoard':13,
        'gameBoardPointer': 0,
        'mines': [],
        'beans': [],
        'mineCount':3,
        'beansCount':6,
        'trapsTriggered':0,
        'currentPlayer': 1,
        'turnScore': 0
    }
};