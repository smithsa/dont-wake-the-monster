'use strict';

var HelperFunctions = {
    // returns a StartInputHandler directive that can be added to an Alexa skill response
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
                    accumulator = accumulator + " and " + name;
                }else{
                    accumulator = accumulator + ", and " + name;
                }
            }else if(index == 0){
                accumulator = accumulator + name;
            }else{
                accumulator = accumulator + ", " + name;
            }
            return accumulator;
        }, "");
        return availableCharactersString;
    }
};

module.exports = HelperFunctions;