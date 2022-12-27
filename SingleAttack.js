main()

let attackCounter = 0

async function main() {
  // Get Selected
  let selected = canvas.tokens.controlled;
  if (selected.length > 1) {
    ui.notifications.error("Please select only one token")
    return;
  }

  let selected_actor = selected[0].actor;
  // Get Target
  let targets = Array.from(game.user.targets)
  if (targets.length == 0 || targets.length > 1) {
    ui.notifications.error("Please target one token");
    return;
  }

  let target_actor = targets[0].actor;

  console.log(selected_actor)
  console.log(target_actor)
  let actorWeapons = selected_actor.items.filter(item => item.type == "weapon")
  actorWeapons.sort((a, b) => (a.system.attackBonus < b.system.attackBonus) ? 1 : -1)

  let weaponOptions = ""
  for (let item of actorWeapons) {
    weaponOptions += `<option value=${item.id}>${item.data.name} | ATK: ${item.system.attackBonus}</option>`
  }

  let dialogTemplate = `
  <h1> Pick a weapon </h1>
  <div style="display:flex-direction: column">
    <div>Extra HIT -> single number can be negative <input  id="hitMod" type="number"  value=0  /></div>
    <div>Extra DMG -> ex: 2d12 6 radiant<input  id="dmgMod" type="text"  value=0  /></div>
    <div>Advantage -> -1 | 0 | 1 <input  id="advantage" type="number" value=0  /></div>
    <div>How many attacks?<input  id="numberOfAttacks" type="number" value=1  /></div>
    <div>How many attackers?<input  id="numberOfAttackers" type="number" value=1  /></div>
  </div>
  </div>
  <div style="display:flex">
      <div style="flex:1"> NO AC?<input id="ignoreArmor" type="checkbox" unChecked style="width:25px;float:left" /></div>
      <div style="flex:1"> CRIT?<input id="critOnHit" type="checkbox" unChecked style="width:25px;float:left" /></div>
      <div style="flex:1"><select id="weapon">${weaponOptions}</select></div>
  </div>
  `
  new Dialog({

    title: "Roll Attack",
    content: dialogTemplate,
   // close: () => { throw new Error('You cannot leave here!'); },
    buttons: {
      rollAtk: {
        label: "Roll Attack",
        callback: (html) => {
          
          let wepID = html.find("#weapon")[0].value;
          let wep = selected_actor.items.find(item => item.id == wepID)
          console.log(wep);
          let numberOfAttacks = 0
          numberOfAttacks = html.find("#numberOfAttacks")[0].value
          let modifier = html.find("#hitMod")[0].value;
          let modifierDamage = html.find("#dmgMod")[0].value;
          let ignoreArmor = html.find("#ignoreArmor")[0].checked;
          let advantage = html.find("#advantage")
          let critOnHit = html.find("#critOnHit")[0].checked;
          let numberOfAttackers = html.find("#numberOfAttackers")[0].checked;

          let elvenAccuracy = selected_actor.getFlag("dnd5e", "elvenAccuracy");
          if(elvenAccuracy == undefined) elvenAccuracy = false

          let halflingLucky = selected_actor.getFlag("dnd5e", "halflingLucky");
          if(halflingLucky == undefined) halflingLucky = false
   
          let critTreshold = selected_actor.getFlag("dnd5e", "weaponCriticalThreshold");
          if(critTreshold == undefined) critTreshold = 20;

          let extraDamage = 0
          if(wep.system.actionType[0] == 'm') {

            let meleeWeaponAttackBonus = selected_actor.getFlag("dnd5e", "meleeWeaponAttackBonus");
            if(meleeWeaponAttackBonus == undefined) meleeWeaponAttackBonus = 0
            else modifier+= meleeWeaponAttackBonus
  
            extraDamage = selected_actor.getFlag("dnd5e", "meleeWeaponDamageBonus");
            if(extraDamage == undefined) extraDamage = 0
  
          }
          else if (wep.system.actionType[0] == 'r') {

            let rangedWeaponAttackBonus = selected_actor.getFlag("dnd5e", "rangedWeaponAttackBonus");
            if(rangedWeaponAttackBonus == undefined) rangedWeaponAttackBonus = 0
            else modifier+= rangedWeaponAttackBonus

            extraDamage = selected_actor.getFlag("dnd5e", "rangedWeaponDamageBonus");
            if(extraDamage == undefined) extraDamage = 0
          }
          
          let isCrit = false;
          let abilityMod = 0;
          switch(wep.system.ability){
            case "str":
            abilityMod=selected_actor.system.abilities.str.mod
            break;
            
            case "dex":
            abilityMod=selected_actor.system.abilities.dex.mod
            break;
            
            case "int":
            abilityMod=selected_actor.system.abilities.int.mod
            break;
            
            case "wis":
            abilityMod=selected_actor.system.abilities.wis.mod
            break;
            
            case "cha":
            abilityMod=selected_actor.system.abilities.cha.mod
            break;
            
            case "con":
            abilityMod=selected_actor.system.abilities.con.mod
            break;       
          }
          if(numberOfAttackers > 1){
            let currentNumberOfAttackers = Math.floor((numberOfAttackers*hpactor)/maxHpactor)
            numberOfAttacks *= currentNumberOfAttackers
          }

          for(let y = 0;y < numberOfAttacks;y++){
            attackCounter++
            isCrit = false;
            let baseTohit = rollDie(1, 20);
            if (advantage == 1){
              baseTohit = Math.max(baseTohit, rollDie(1, 20))
              if(elvenAccuracy && wep.system.ability != 'str' && wep.system.ability != 'con' ||
                advantage == 2) baseTohit = math.max(baseTohit,rollDie(1,20))
            } 
            else if (advantage == -1 ) baseTohit = Math.min(baseTohit, rollDie(1, 20))
  
            if(baseTohit == 1 && halflingLucky) baseTohit = rollDie(1, 20);
  
            console.log("baseTohit " + baseTohit)
            isCrit = (baseTohit >= critTreshold)
  
            // See if Attack is Greater than their armor, if so
            let result = parseInt(baseTohit) + parseInt(wep.system.attackBonus) + parseInt(modifier) + parseInt(abilityMod) + parseInt(selected_actor.system.attributes.prof)
  
  
            console.log("To hit " + result)
  
            // Print Chat with Button to Roll Damage
            let chatTemplate = ""
            //let chatFirstMessage ="Rolled: natural "+result+" against "+armor+" Target Armor"
  
            let armor = parseInt(target_actor.system.attributes.ac.value) && !ignoreArmor ? parseInt(target_actor.system.attributes.ac.value) : 0;
            if (isCrit) {
              chatTemplate = `
              <p> Rolled: ${result} (${baseTohit}) against ${armor} Target AC </p>
              <p> It was a CRIT! </p>
              <p> It was a CRIIIIIIIIIIIIT! </p>
              <p> <button id="rollDamage">Roll Damage</button></p>
              `
            }
            else {
              if (result >= armor) {
                if(critOnHit){
                  isCrit = true;
                  chatTemplate = `
                  <p> Rolled: ${result} (${baseTohit}) against ${armor} Target AC </p>
                  <p> It was a CRIT! </p>
                  <p> It was a CRIIIIIIIIIIIIT! </p>
                  <p> <button id="rollDamage">Roll Damage</button></p>
                  `
                } else {
                  chatTemplate = `
                  <p> Rolled: ${result} (${baseTohit}) against ${armor} Target AC </p>
                  <p> It was a Hit! </p>
                  <p> <button id="rollDamage">Roll Damage</button></p>
                  `
                }
              } else {
                chatTemplate = `
                <p> Rolled: ${result} (${baseTohit}) against ${armor} Target AC </p>
                  <p> It was a Miss! </p>
                  `
              }
            } 
            if(numberOfAttacks == 1){
              ChatMessage.create({
                speaker: {
                  alias: selected_actor.name
                },
                content: chatTemplate,
                result: result
              })
            }else if(result >= armor || isCrit){
              let finaldmg = 0
              let extraBaseDmg = parseInt(abilityMod) + parseInt(extraDamage);

              let wepDmg = (wep.system.damage?.parts ? wep.system.damage.parts : "")
              let finalList = [];

              for(let i = 0; i < wepDmg.length; i ++){
                finalList.push([wepDmg[i][0],wepDmg[i][1]])
              }

              if(modifierDamage != 0) finalList.push([modifierDamage,modifierDamage])

              for (let i = 0; i < finalList.length; i++) {

                let baseFormula = finalList[i][0]

                console.log(baseFormula + " <- BASE ");

                let regex = /([a-z]{4,})/;
                let type = finalList[i][1].match(regex)
                if (type == null) type = 'piercing'
                else type = type[0]

                console.log(type + "   type")

                regex = /([0-9]+)d([0-9]+)|([0-9]+)/g;
                let listResult = baseFormula.match(regex);
                console.log(listResult + "   RESULT");

                let currentDamage = 0;

                for (let i = 0; i < listResult.length; i++) {

                  let currentRoll = 0;
                  if (listResult[i].match(/([0-9]+)d([0-9]+)/) != null) {

                    let xplit = listResult[i].split('d');
                    let numberOfDices = parseInt(xplit[0])
                    if(isCrit) numberOfDices*=2

                    for (let a = 0; a < numberOfDices; a++) {
                      currentRoll += rollDie(1, parseInt(xplit[1]));
                      console.log(currentRoll+" <- <- added roll damage")
                    }
                  } else if (listResult[i].match(/([0-9]+)/) != null) currentRoll = parseInt(listResult[i]);
                  currentDamage += currentRoll;
                }

                let resistances = target_actor.system.traits.dr.value
                let immunities = target_actor.system.traits.di.value
                if(i == 0) currentDamage+=extraBaseDmg

                if (immunities.length > 0 && searchStringInArray(type, immunities) != -1) {
                   
                  ChatMessage.create({
                  content: `Target immune to ${currentDamage} ${type} damage`});
                  currentDamage = 0;

                } else if (resistances.length > 0 && searchStringInArray(type, resistances) != -1) {

                  currentDamage *= .5;
                  ChatMessage.create({
                    content: `Target resistant to ${currentDamage} ${type} damage`});
                    
                }
                finaldmg += currentDamage
                parseInt(finaldmg) 
                console.log("Dealt "+ currentDamage +" "+ type + " damage")
              }

              let hp = target_actor.system.attributes.hp.value
              let maxHp = target_actor.system.attributes.hp.max

              let updatedHp = finaldmg > hp ? 0 : hp - finaldmg

              target_actor.update({ 'system.attributes.hp.value': updatedHp > maxHp ? maxHp : updatedHp })

              ChatMessage.create({
                content: `You dealt ${finaldmg} damage!`

              });
              
              
            }
          }
          if(numberOfAttacks > 1 )throw new Error('You have made '+ attackCounter + ' attacks')



          // Roll Damage
          Hooks.once('renderChatMessage', (chatItem, html) => {
            html.find("#rollDamage").click(() => {

              let finaldmg = 0
              let extraBaseDmg = parseInt(abilityMod) + parseInt(extraDamage);

              let wepDmg = (wep.system.damage?.parts ? wep.system.damage.parts : "")
              let finalList = [];

              for(let i = 0; i < wepDmg.length; i ++){
                finalList.push([wepDmg[i][0],wepDmg[i][1]])
              }

              if(modifierDamage != 0) finalList.push([modifierDamage,modifierDamage])

              for (let i = 0; i < finalList.length; i++) {

                let baseFormula = finalList[i][0]

                console.log(baseFormula + " <- BASE ");

                let regex = /([a-z]{4,})/;
                let type = finalList[i][1].match(regex)
                if (type == null) type = 'piercing'
                else type = type[0]

                console.log(type + "   type")

                regex = /([0-9]+)d([0-9]+)|([0-9]+)/g;
                let listResult = baseFormula.match(regex);
                console.log(listResult + "   RESULT");

                let currentDamage = 0;

                for (let i = 0; i < listResult.length; i++) {

                  let currentRoll = 0;
                  if (listResult[i].match(/([0-9]+)d([0-9]+)/) != null) {

                    let xplit = listResult[i].split('d');
                    let numberOfDices = parseInt(xplit[0])
                    if(isCrit) numberOfDices*=2

                    for (let a = 0; a < numberOfDices; a++) {
                      currentRoll += rollDie(1, parseInt(xplit[1]));
                      console.log(currentRoll+" <- <- added roll damage")
                    }
                  } else if (listResult[i].match(/([0-9]+)/) != null) currentRoll = parseInt(listResult[i]);
                  currentDamage += currentRoll;
                }

                let resistances = target_actor.system.traits.dr.value
                let immunities = target_actor.system.traits.di.value
                if(i == 0) currentDamage+=extraBaseDmg

                if (immunities.length > 0 && searchStringInArray(type, immunities) != -1) {
                   
                  ChatMessage.create({
                  content: `Target immune to ${currentDamage} ${type} damage`});
                  currentDamage = 0;

                } else if (resistances.length > 0 && searchStringInArray(type, resistances) != -1) {

                  currentDamage *= .5;
                  ChatMessage.create({
                    content: `Target resistant to ${currentDamage} ${type} damage`});
                    
                }
                finaldmg += currentDamage
                parseInt(finaldmg) 
                console.log("Dealt "+ currentDamage +" "+ type + " damage")
              }

              let hp = target_actor.system.attributes.hp.value
              let maxHp = target_actor.system.attributes.hp.max

              let updatedHp = finaldmg > hp ? 0 : hp - finaldmg

              target_actor.update({ 'system.attributes.hp.value': updatedHp > maxHp ? maxHp : updatedHp })

              ChatMessage.create({
                content: `You dealt ${finaldmg} damage!`

              });

            })
          })
          throw new Error('You have made '+ attackCounter + ' attacks')
        }
      },
      rollAtk2: {
        label: "Reset Attacks",
        callback: () => {
          attackCounter = 0
          throw new Error('You have made '+ attackCounter + ' attacks')
        }},
    }
  }).render(true)
}


function searchStringInArray(str, strArray) {
  for (var j = 0; j < strArray.length; j++) {
    if (strArray[j].match(str)) return j;
  }
  return -1;
}

function rollDie(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
