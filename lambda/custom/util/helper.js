'use strict';

const HelperFunctions = {
    /*
    * Returns a StartInputHandler directive that can be added to an Alexa skill response
    */
    'getRemainingCharacterNames': function(chosenCharacters, charactersList) {
        let availableCharacters = charactersList.filter(function(name) {
            //return items that are not in the chosenCharacter list
            return  chosenCharacters.indexOf(name) === -1;
        });

        let availableCharactersString = availableCharacters.reduce(function(accumulator, name, index, list){
            if(list.length === 1){
                return accumulator+name;
            }else if(index === list.length-1 && list.length !== 1){
                if(list.length == 2){
                    accumulator = accumulator + " and the " + name;
                }else{
                    accumulator = accumulator + ", and the " + name;
                }
            }else if(index == 0){
                accumulator = accumulator + name;
            }else{
                accumulator = accumulator + ", " + name;
            }
            return accumulator;
        }, "");
        return availableCharactersString;
    },
    /*
    * Returns a random number.
    */
    'getRandomInteger': (min, max) => {
        return Math.floor(Math.random() * (max - min + 1) ) + min;
    },

    /*
    * Returns a list of unique random numbers.
    */
    'getUniqueRandomIntegers': (count, max, min = 0, random_integers = []) => {
        if (random_integers.length == count){
            return random_integers;
        }

        let randomNumber = HelperFunctions.getRandomInteger(0, max);
        if(random_integers.indexOf(randomNumber) === -1){
            random_integers.push(randomNumber);
        }

        return HelperFunctions.getUniqueRandomIntegers(count, max, min, random_integers);
    },

    /*
    * Returns a list of unique random numbers which are not in a given list of numbers.
    */
    'getUniqueRandomIntegersWithRestrictions': (count, max, restricted_numbers, min = 0, random_integers = []) => {
        if (random_integers.length == count){
            return random_integers;
        }

        let randomNumber = HelperFunctions.getRandomInteger(0, max);
        if(random_integers.indexOf(randomNumber) === -1 && restricted_numbers.indexOf(randomNumber) === -1){
            random_integers.push(randomNumber);
        }

        return HelperFunctions.getUniqueRandomIntegersWithRestrictions(count, max, restricted_numbers, min, random_integers);
    },
    /*
    * Represents a move on the board. 1 means a bean was there, -1 means a bomb was there, 0 means there was nothing there.
    */
     'checkMoveOnBoard': (spaceNumber, mines, beans) => {
        if(mines.indexOf(spaceNumber) > -1){
            return -1;
        }
        else if(beans.indexOf(spaceNumber) > -1){
            return 1;
        }else{
            return 0;
        }

    },
    /*
    * Get the winner of the round or overall game
    */
    'getWinner': (playersScore) => {
        const players = Object.keys(playersScore);
        let highScore = 0;
        let winners = [];
        for(let player of players){
            if(parseInt(playersScore[player]) > highScore){
                highScore = playersScore[player];
                winners = [];
                winners.push(player);
            }else if(parseInt(playersScore[player]) === highScore){
                winners.push(player);
            }
        }

        return winners;
    }

};

module.exports = HelperFunctions;