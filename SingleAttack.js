main()

async function main(){
  // Get Selected
  let selected = canvas.tokens.controlled;
  if(selected.length > 1){
    ui.notifications.error("Please select only one token")
    return;
  }

  let selected_actor = selected[0].actor;
  // Get Target
  let targets = Array.from(game.user.targets)
  if(targets.length == 0 || targets.length > 1 ){
    ui.notifications.error("Please target one token");
    return;
  }

  let target_actor = targets[0].actor;

  console.log(selected_actor)
  console.log(target_actor)
  let actorWeapons = selected_actor.items.filter(item => item.type == "weapon")
  actorWeapons.sort((a, b) => (a.system.attackBonus < b.system.attackBonus) ? 1 : -1)

  let weaponOptions = ""
  for(let item of actorWeapons){
    weaponOptions += `<option value=${item.id}>${item.data.name} | ATK: ${item.system.attackBonus}</option>`
  }

  let dialogTemplate = `
  <h1> Pick a weapon </h1>
  <div style="display:flex">
    
    <span >Mod <input  id="mod" type="number" style="width:50px;float:right" value=0  /></span>
    <span >Advantage <input  id="advantage" type="number" style="width:50px;float:right" value=0  /></span>
    <div style="flex:5"><input id="ignoreArmor" type="checkbox" unChecked style="width:50px;float:right" /></div>
    <div  style="flex:1"><select id="weapon">${weaponOptions}</select></div>
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
            let ignoreArmor = html.find("#ignoreArmor")[0].checked;
            let advantage = html.find("#advantage")
            // Roll Attack
            let critTreshold = 18;
            let isCrit = false;
            let baseTohit = rollDie(1,20);
            if(advantage > 0) baseTohit = Math.max(rollDie(1,20),rollDie(1,20))
            else baseTohit = Math.min(rollDie(1,20),rollDie(1,20))
            console.log("baseTohit "+ baseTohit)
            isCrit = (baseTohit >= critTreshold) 
            
           
            // See if Attack is Greater than their armor, if so
            let result = parseInt(baseTohit)  +parseInt(wep.system.attackBonus ) +parseInt(modifier)  +parseInt(selected_actor.system.abilities.str.value) 

            console.log("To hit "+ result)

            // Print Chat with Button to Roll Damage
            let chatTemplate = ""
          
            let armor = parseInt(target_actor.system.attributes.ac.value) && !ignoreArmor ? parseInt(target_actor.system.attributes.ac.value) : 0;
            
            if(result > armor){
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
            
            ChatMessage.create({
            speaker: {
                alias: selected_actor.name
            },
            content: chatTemplate,
            roll: roll
            })
            
            // Roll Damage
            Hooks.once('renderChatMessage', (chatItem, html) => {
            html.find("#rollDamage").click(() => {
              
                let finaldmg = 0;
                let wepDmg = (wep.system.damage?.parts ? wep.system.damage.parts : "" )

                for(let i = 0; i < wepDmg.length;i++){
                    
                    let baseFormula = wepDmg[i][0]

                    console.log(baseFormula+ " <- BASE ");
                
                    
                    let regex = /([0-9]+)d([0-9]+)|[0-9]/g;
                    let listResult = baseFormula.match(regex);
                    console.log(listResult+ "   RESULT")


                    regex = /([a-z]{4,})/;
                    let type = baseFormula.match(regex)
                    if(type == null) type = 'piercing'
                    else type = type[0]
                    
                    console.log(type[0]+ "   type")

                    let currentDamage = 0;

                    for(let i = 0; i < listResult.length; i++){
                      console.log("errrrrrr")
        
                      let currentRoll = 0;
                      if(listResult[i].match(/([0-9]+)d([0-9]+)/) != null){
                          
                        let x = parseInt(listResult[i][0])
                        let xplit = listResult[i].split('d')

                        for(let a = 0; a < x; a++){
                          currentRoll+= rollDie(1, parseInt(xplit[1]));
                          console.log(currentRoll+" currentroll")
                        }

                        if(isCrit) currentRoll*=2;

                      } else if(listResult[i].match(/([0-9]+)/) != null) currentRoll = parseInt(listResult[i])
                        
                        currentDamage += currentRoll;
                        console.log(currentDamage+" litle bits boooois")
                    }

                    let resistances = target_actor.system.traits.dr.value
                    let immunities = target_actor.system.traits.di.value


                    if(immunities.length > 0){
                        if(searchStringInArray(type,immunities)!= -1) currentDamage=0;
                        
                    } 
                    
                    if(resistances.length > 0){
                        if(searchStringInArray(type,resistances)!= -1) currentDamage*=.5;                       
                    }

                    finaldmg += currentDamage 


                }

                let hp = target_actor.system.attributes.hp.value
                let maxHp = target_actor.system.attributes.hp.max
        
                let updatedHp = finaldmg > hp ? 0 : hp - finaldmg
        
                target_actor.update({'system.attributes.hp.value': updatedHp > maxHp ? maxHp : updatedHp})

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


function searchStringInArray (str, strArray) {
    for (var j=0; j<strArray.length; j++) {
        if (strArray[j].match(str)) return j;
    }
    return -1;
}

function rollDie(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
