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
        EXIT_MODE: '_EXIT_MODE'
    },

    // We'll use an audio sample of a ticking clock to play whenever the skill is waiting for button presses
    // This is an audio file from the ASK Soundbank: https://developer.amazon.com/docs/custom-skills/foley-sounds.html
    WAITING_AUDIO: '<audio src="https://s3.amazonaws.com/ask-soundlibrary/foley/amzn_sfx_rhythmic_ticking_30s_01.mp3"/>',

    // We'll set up a map of custom colors to each of the three allowed colord: blue, green and red
    BREATH_CUSTOM_COLORS: { 
        'blue': '184066',
        'green': '184518',
        'red': '603018',
        'black': '000000',
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
        'playerCount': 0,
        'overallScore': {
            'player1': 0,
            'player2': 0,
            'player3': 0,
            'player4': 0
        },
        'roundScore': {
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
        'characterRollCounter': 0,
        'round': 1,
        'currentPlayer': 1
    }
};