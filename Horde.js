class WeaponDamage{ 
    constructor(){  
        this.totalDamage = [];
    }

    addDamage(maxDie,rolls,type){
        let p = new Damage(maxDie,rolls,type);
        this.totalDamage.push(p);
        return p;
    }

    get getAllDamage(){
        return this.totalDamage;
    }

    get getNumberOfDamages(){
        return this.totalDamage.length
    }

}

class Damage{ 
    constructor(maxDie, rolls, type){
        this.maxDie = maxDie;
        this.rolls = rolls;
        this.type = type;
    }

    get getDamage(){
        return rollDie(1,this.maxDie)*this.rolls
    }

    get getDamageType(){
        return this.type;
    }

    get getMaxDie(){
        return this.maxDie;
    }
}

const DamageTypes = {
	necrotic: 'necrotic',
	piercing: 'piercing',
}

const Options = {
    advantage: -1,
    disadvantage: 1,
    critImmune: 2,
}

let ci = 1.0;
let advantage = 0;

main()

async function main(){
    console.log("War");
    //Is a token selected?
    console.log("Tokens: ", canvas.tokens.controlled)
    if(canvas.tokens.controlled.lenth == 0 || canvas.tokens.controlled.length > 1){
        ui.notifications.error("1 - Please select a single token");
        return;
    }
    //is target selected?
    if(game.user.targets.size != 1){
        ui.notifications.error("2 - Please target a single enemy [T] ");
        return;
    }

    let actor = canvas.tokens.controlled[0].actor
    let targetActor = game.user.targets.values().next().value.actor;

    let hpactor = actor.data.data.attributes.hp.value
    let maxHpactor = actor.data.data.attributes.hp.max
    let numberOfAttackers = Math.floor((16*hpactor)/maxHpactor)
    if(numberOfAttackers <= 0) numberOfAttackers = 1

    let critTreshold = 18
    let multiAttack = 3
    let critCounter = 0
    let totalAttacks = numberOfAttackers * multiAttack
    let totalDamage =  new WeaponDamage();
    totalDamage.addDamage(10,5,DamageTypes.necrotic)
    totalDamage.addDamage(10,5,DamageTypes.piercing)

    //Ask for input
    let cc = `
    <form>
        <div class="form-group">
        <label for="id="damage-amount">Advantage</label>
        <input id="damage-amount" type="number" name="inputField" autofocus>
        </div>
        <div class="form-group">
        <label for="id="damage-amount">Crit Immunity</label>
        <input id="damage-amount" type="number" name="inputField2" autofocus>
        </div>
    </form>`
    new Dialog({
        title: 'Horde',
        content: cc,
        buttons:{
            yes: {
            icon: "<i class='fas fa-check'></i>",
            label: `Apply`,
            },
        },

        default:'yes',

        close: async html => {
        let ad = html.find('input[name=\'inputField\']');
        ad = ad.val();
        if (ad !== '') {
            if(ad > 0) myCallback(Options.advantage) 
            else myCallback(Options.disadvantage) 
        }  

        let critImmune =  html.find('input[name=\'inputField1\']');
        critImmune = critImmune.val();
        if (critImmune !== '') {
            myCallback(Options.critImmune);
        } 

        let numberOfHits = 0;
        for (let i = 0; i < totalAttacks ; i++) {
            let toHit = 10;
            if(advantage == 0) toHit = rollDie(1,20);
            else if(advantage > 0) toHit = Math.max(rollDie(1,20),rollDie(1,20))
            else toHit = Math.min(rollDie(1,20),rollDie(1,20))

            if (toHit >= critTreshold ) critCounter++
            else{
                let finalToHit = toHit;
                finalToHit += 6+5+2;
                
                if(finalToHit >= targetActor.data.data.attributes.ac.value) numberOfHits+= 1 //targetActor.data.data.attributes.ac.base
            } 
        }
        numberOfHits+= critCounter; 
        ui.notifications.error("->"+numberOfHits+ " hits ->"+critCounter+" crits ->"+targetActor.data.data.attributes.ac.value+" AC");
    
        let finalDamage = 0;
        for(let a = 0; a < numberOfHits; a++) {
    
            let critMulti = 1;    
            if(critCounter > 0){
                critMulti = 2 * ci;
                
                critCounter--;
            }
    
            let damageRoll = 0;
    
            for(let y = 0; y < totalDamage.getNumberOfDamages; y++) {
                
                let currentDamage = 0
    
                currentDamage+= totalDamage.getAllDamage[y].getDamage;
    
                let resistances = targetActor.data.data.traits.dr.value
                let immunities = targetActor.data.data.traits.di.value
            
                if(immunities.length > 0){
                    if(searchStringInArray(totalDamage.getAllDamage[y].getDamageType,immunities)!= -1) currentDamage=0;
                    
                } 
                
                if(resistances.length > 0){
                    if(searchStringInArray(totalDamage.getAllDamage[y].getDamageType,resistances)!= -1) currentDamage/=2;                       
                }
    
                damageRoll+= currentDamage 
            }
            let x = ~~(damageRoll*critMulti) + actor.data.data.abilities.str.mod + 3;
            console.log(x+ " damage dealt");
            finalDamage+= x
    
        }
            
        finalDamage+= targetActor.data.data.abilities.str.mod
        console.log("finalDamage -> "+finalDamage );
    
        let hp = targetActor.data.data.attributes.hp.value
        let maxHp = targetActor.data.data.attributes.hp.max
        let updatedHp = finalDamage > hp ? 0 : hp - finalDamage 
    
        targetActor.update({'data.attributes.hp.value': updatedHp > maxHp ? maxHp : updatedHp})
    }
    }).render(true);
  

}

function myCallback(value) {

    switch (value)
    {
        case Options.critImmune:
            ci = 0.5;
            break;
        case Options.advantage:
            advantage = 1;
            break;
        case Options.disadvantage:
            advantage = -1;
            break;
            
    }
}


function rollDie(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function searchStringInArray (str, strArray) {
    for (var j=0; j<strArray.length; j++) {
        if (strArray[j].match(str)) return j;
    }
    return -1;
}