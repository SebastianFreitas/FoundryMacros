main()

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
    <div>Extra HIT -> single number can be negative <input  id="mod" type="number"  value=0  /></div>
    <div>Extra DMG -> ex: 2d12 6 radiant<input  id="mod1" type="text"  value=0  /></div>
    <div>Advantage -> -1 | 0 | 1 | 2 <input  id="advantage" type="number" value=0  /></div>
  </div>

  <div style="display:flex">
      <div style="flex:1"> NO AC?<input id="ignoreArmor" type="checkbox" unChecked style="width:25px;float:left" /></div>
      <div style="flex:1"><select id="weapon">${weaponOptions}</select></div>
  </div>
  `
  new Dialog({
    title: "Roll Attack",
    content: dialogTemplate,
    buttons: {
      rollAtk: {
        label: "Roll Attack",
        callback: async (html) => {
          let wepID = html.find("#weapon")[0].value;
          let wep = selected_actor.items.find(item => item.id == wepID)
          console.log(wep);
          let modifier = html.find("#mod")[0].value;
          let modifierDamage = html.find("#mod1")[0].value;
          let ignoreArmor = html.find("#ignoreArmor")[0].checked;
          let advantage = html.find("#advantage")
          // Roll Attack
          let critTreshold = 18;
          let isCrit = false;
          let baseTohit = rollDie(1, 20);
          if (advantage > 0) baseTohit = Math.max(rollDie(1, 20), rollDie(1, 20))
          else baseTohit = Math.min(rollDie(1, 20), rollDie(1, 20))
          console.log("baseTohit " + baseTohit)
          isCrit = (baseTohit >= critTreshold)


          // See if Attack is Greater than their armor, if so
          let result = parseInt(baseTohit) + parseInt(wep.system.attackBonus) + parseInt(selected_actor.system.abilities.str.value) + parseInt(modifier)

          console.log("To hit " + result)

          // Print Chat with Button to Roll Damage
          let chatTemplate = ""

          let armor = parseInt(target_actor.system.attributes.ac.value) && !ignoreArmor ? parseInt(target_actor.system.attributes.ac.value) : 0;
          if (isCrit) {
            chatTemplate = `
            <p> Rolled: ${result} against ${armor} Target Armor </p>
            <p> It was a CRIT! </p>
            <p> It was a CRIIIIIIIIIIIIT! </p>
            <p> <button id="rollDamage">Roll Damage</button></p>
            `
          }
          else {
            if (result > armor) {
              chatTemplate = `
                <p> Rolled: ${result} against ${armor} Target Armor </p>
                <p> It was a Hit! </p>
                <p> <button id="rollDamage">Roll Damage</button></p>
                `
            } else {
              chatTemplate = `
                <p> Rolled: ${result} against ${armor} Target Armor </p>
                <p> It was a Miss! </p>
                `
            }
          }

          ChatMessage.create({
            speaker: {
              alias: selected_actor.name
            },
            content: chatTemplate,
            result: result
          })

          // Roll Damage
          Hooks.once('renderChatMessage', (chatItem, html) => {
            html.find("#rollDamage").click(() => {

              let finaldmg = selected_actor.system.abilities.str.value;
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

                    for (let a = 0; a < parseInt(xplit[0]); a++) {
                      currentRoll += rollDie(1, parseInt(xplit[1]));
                    }

                    if (isCrit) currentRoll *= 2;

                  } else if (listResult[i].match(/([0-9]+)/) != null) currentRoll = parseInt(listResult[i]);

                  currentDamage += currentRoll;
                }

                let resistances = target_actor.system.traits.dr.value
                let immunities = target_actor.system.traits.di.value


                if (immunities.length > 0 && searchStringInArray(type, immunities) != -1) {
                   currentDamage = 0;
                   console.log("is immune to "+ type);

                } else
                if (resistances.length > 0 && searchStringInArray(type, resistances) != -1) {
                  currentDamage *= .5;
                  console.log("is resistant to "+ type);
                }

                finaldmg += currentDamage 
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
        }
      },
      close: {
        label: "Close"
      }
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
