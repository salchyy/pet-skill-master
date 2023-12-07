module.exports = function petmaster(mod) {
    mod.game.initialize("me.abnormalities");

    // Definición de protocolos
    const protocolDefinitions = [
        { name: "C_START_SERVANT_ACTIVE_SKILL", version: 99, structure: [["unk1", "int32"], ["unk2", "int32"], ["gameId", "uint64"], ["petskill", "int32"]] },
        { name: "S_START_COOLTIME_SERVANT_SKILL", version: 99, structure: [["cooldown", "uint32"]] }
    ];

    protocolDefinitions.forEach(def => mod.dispatch.addDefinition(def.name, def.version, def.structure));

    // Variables de estado
    let enabled = true,
        isOnCooldown = false,
        cooldownTimeout = null,
        petState = { spawned: false, id: null, skill: null },
        skillMapping = { power: 1138, magical: 1138, physical: 1138 },
        requirements = { power: 142, magical: 142, physical: 142 };

    // Comandos y hooks
    mod.command.add("apet", () => toggleModState());
    mod.hook('S_START_COOLTIME_SERVANT_SKILL', 99, event => handleCooldown(event));
    mod.hook('S_REQUEST_SPAWN_SERVANT', 4, event => handlePetSpawn(event));
    mod.hook('S_REQUEST_DESPAWN_SERVANT', 1, event => handlePetDespawn(event));
    mod.hook('S_PLAYER_STAT_UPDATE', 14, () => tryUsePetSkill());

    // Funciones de ayuda
    function toggleModState() {
        enabled = !enabled;
        mod.command.message(`Mod enabled: ${enabled}`);
    }

    function handleCooldown(event) {
        clearTimeout(cooldownTimeout);
        isOnCooldown = true;
        cooldownTimeout = setTimeout(() => isOnCooldown = false, event.cooldown);
    }

	function handlePetSpawn(event) {
		if (event.ownerId !== mod.game.me.gameId) return;

		for (const ability of event.abilities) {
			if (ability.active) {
				petState.skill = skillMapping[getKeyByValue(requirements, ability.id)];
				if (petState.skill) {
					petState.spawned = true;
					petState.id = event.gameId;
					tryUsePetSkill();
					break; // Salimos del bucle una vez encontrada la habilidad correspondiente
				}
			}
		}
	}

    function handlePetDespawn(event) {
        if (event.gameId === petState.id && event.despawnType === 0) {
            petState = { spawned: false, id: null, skill: null };
        }
    }

    function tryUsePetSkill() {
        if (!isOnCooldown && petState.spawned && petState.id && petState.skill && enabled) {
            mod.send("C_START_SERVANT_ACTIVE_SKILL", 99, { unk1: 0, unk2: 0, gameId: petState.id, petskill: petState.skill });
        }
    }

    function getKeyByValue(object, value) {
        return Object.keys(object).find(key => object[key] === value);
    }
}
