// Определение всех ролей
const ROLES = {
    // Базовые роли
    mafia: { name: 'Мафия', type: 'mafia', nightOrder: 1, nightAction: 'kill', description: 'Выбирает жертву для убийства' },
    doctor: { name: 'Доктор', type: 'peaceful', nightOrder: 2, nightAction: 'heal', description: 'Выбирает кого вылечить' },
    sheriff: { name: 'Шериф', type: 'peaceful', nightOrder: 3, nightAction: 'sheriffKill', description: 'Может убить игрока ночью. Если убивает мирного - умирает сам. Если мафию - умирает мафия. Может пропустить.' },
    commissioner: { name: 'Комиссар', type: 'peaceful', nightOrder: 3, nightAction: 'check', description: 'Проверяет игрока на мафию' },
    prostitute: { name: 'Проститутка', type: 'peaceful', nightOrder: 5, nightAction: 'blockVote', description: 'Блокирует возможность голосовать в игрока и ему голосовать' },
    peaceful: { name: 'Мирный житель', type: 'peaceful', nightOrder: 999, nightAction: null, description: 'Обычный житель города' },

    // Необычные роли
    mayor: { name: 'Мэр', type: 'peaceful', nightOrder: 999, nightAction: null, description: 'Голос мэра считается как два голоса', votingPower: 2 },
    maniac: { name: 'Маньяк', type: 'neutral', nightOrder: 4, nightAction: 'kill', description: 'Выбирает жертву для убийства' },
    random: { name: 'Рандом', type: 'peaceful', nightOrder: 999, nightAction: null, description: 'Случайная роль: мэр или шут', isRandom: true },
    jester: { name: 'Шут', type: 'neutral', nightOrder: 999, nightAction: null, description: 'Выигрывает, если его выгнали голосованием', specialWin: 'voting' }
};

// Состояние игры
let gameState = {
    playerCount: 8,
    players: [],
    selectedRoles: [],
    currentScreen: 'screen-players',
    currentPlayerIndex: 0,
    nightPhase: {
        currentRoleIndex: 0,
        actions: {},
        results: {}
    },
    voting: {
        votes: {},
        currentTarget: null,
        currentVoters: []
    },
    lawyerDefense: null
};

function getSuggestedRoles(playerCount) {
    const suggestions = {
        4: { mafia: 1, doctor: 1, sheriff: 1, peaceful: 1 },
        5: { mafia: 1, doctor: 1, sheriff: 1, peaceful: 2 },
        6: { mafia: 1, doctor: 1, sheriff: 1, peaceful: 3 },
        7: { mafia: 2, doctor: 1, sheriff: 1, peaceful: 3 },
        8: { mafia: 2, doctor: 1, sheriff: 1, peaceful: 4 },
        9: { mafia: 2, doctor: 1, sheriff: 1, peaceful: 5 },
        10: { mafia: 2, doctor: 1, sheriff: 1, peaceful: 6 },
        11: { mafia: 3, doctor: 1, sheriff: 1, peaceful: 6 },
        12: { mafia: 3, doctor: 1, sheriff: 1, peaceful: 7 },
        13: { mafia: 3, doctor: 1, sheriff: 1, peaceful: 8 },
        14: { mafia: 3, doctor: 1, sheriff: 1, peaceful: 9 },
        15: { mafia: 4, doctor: 1, sheriff: 1, peaceful: 9 },
        16: { mafia: 4, doctor: 1, sheriff: 1, peaceful: 10 },
        17: { mafia: 4, doctor: 1, sheriff: 1, peaceful: 11 },
        18: { mafia: 4, doctor: 1, sheriff: 1, peaceful: 12 },
        19: { mafia: 5, doctor: 1, sheriff: 1, peaceful: 12 },
        20: { mafia: 5, doctor: 1, sheriff: 1, peaceful: 13 }
    };

    Object.keys(suggestions).forEach(key => {
        const entry = suggestions[key];
        if (entry.peaceful && entry.peaceful > 0) {
            entry.peaceful = Math.max(0, entry.peaceful - 1);
            entry.prostitute = (entry.prostitute || 0) + 1;
        }
    });

    return suggestions[playerCount] || suggestions[8];
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    runIntroThenInit();
});

function runIntroThenInit() {
    const overlay = document.getElementById('intro-overlay');
    const textEl = document.getElementById('intro-text');
    if (!overlay || !textEl) {
        initializeGame();
        return;
    }

    const showWord = (word, duration) => {
        return new Promise(resolve => {
            textEl.textContent = word;
            requestAnimationFrame(() => {
                textEl.classList.add('show');
            });
            setTimeout(() => {
                textEl.classList.remove('show');
                setTimeout(resolve, 200);
            }, duration);
        });
    };

    (async () => {
        await showWord('Мафия', 900);
        await new Promise(r => setTimeout(r, 150));
        await showWord('Dritmii', 900);
        overlay.style.transition = 'opacity 400ms ease';
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.remove();
            initializeGame();
        }, 450);
    })();
}

function initializeGame() {
    document.getElementById('btn-next-players').addEventListener('click', () => {
        const count = parseInt(document.getElementById('player-count').value);
        if (count >= 4 && count <= 20) {
            gameState.playerCount = count;
            showScreen('screen-roles');
            setupRolesScreen();
        } else {
            alert('Количество игроков должно быть от 4 до 20');
        }
    });

    document.getElementById('btn-next-roles').addEventListener('click', () => {
        if (gameState.selectedRoles.length === 0) {
            alert('Выберите хотя бы одну роль');
            return;
        }
        showScreen('screen-names');
        setupNamesScreen();
    });

    document.getElementById('btn-next-names').addEventListener('click', () => {
        const names = Array.from(document.querySelectorAll('.player-input input'))
            .map(input => input.value.trim())
            .filter(name => name !== '');

        if (names.length !== gameState.playerCount) {
            alert('Заполните имена всех игроков');
            return;
        }

        gameState.players = names.map((name, index) => ({
            id: index,
            name: name,
            role: null,
            alive: true,
            votes: 0
        }));

        distributeRoles();
        showScreen('screen-assignment');
        setupAssignmentScreen();
    });

    document.getElementById('btn-show-role').addEventListener('click', () => {
        const roleDisplay = document.getElementById('role-display');
        const roleText = document.getElementById('role-text');
        const currentPlayer = gameState.players[gameState.currentPlayerIndex];

        roleText.textContent = currentPlayer.role.name;

        const roleCard = roleText.parentElement;
        roleCard.className = 'role-card';
        if (currentPlayer.role.type === 'mafia') {
            roleCard.style.background = 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)';
        } else if (currentPlayer.role.type === 'neutral') {
            roleCard.style.background = 'linear-gradient(135deg, #ffc107 0%, #e0a800 100%)';
        } else if (currentPlayer.role.name !== 'Мирный житель') {
            roleCard.style.background = 'linear-gradient(135deg, #28a745 0%, #218838 100%)';
        } else {
            roleCard.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        }

        roleDisplay.classList.remove('hidden');
        document.getElementById('btn-show-role').classList.add('hidden');
        document.getElementById('btn-next-player').classList.remove('hidden');
    });

    document.getElementById('btn-next-player').addEventListener('click', () => {
        const roleDisplay = document.getElementById('role-display');
        roleDisplay.classList.add('hidden');
        document.getElementById('btn-show-role').classList.remove('hidden');
        document.getElementById('btn-next-player').classList.add('hidden');

        gameState.currentPlayerIndex++;

        if (gameState.currentPlayerIndex >= gameState.players.length) {
            showScreen('screen-roles-overview');
            setupRolesOverview();
        } else {
            updateAssignmentScreen();
        }
    });

    document.getElementById('btn-start-game').addEventListener('click', () => {
        startNightPhase();
    });

    document.getElementById('btn-next-night-action').addEventListener('click', () => {
        processNextNightAction();
    });

    document.getElementById('btn-end-night').addEventListener('click', () => {
        startVoting(); // Начинаем день (голосование)
    });

    document.getElementById('btn-confirm-vote').addEventListener('click', () => {
        confirmVote();
    });

    document.getElementById('btn-end-voting').addEventListener('click', () => {
        endVoting();
    });

    const skipVoteBtn = document.getElementById('btn-skip-vote');
    if (skipVoteBtn) {
        skipVoteBtn.addEventListener('click', () => {
            if (!confirm('Пропустить голосование? Никто не выбывает.')) return;
            gameState.voting = { votes: {}, currentTarget: null, currentVoters: [] };
            const votersPanel = document.getElementById('voting-voters');
            const resultsPanel = document.getElementById('voting-results');
            if (votersPanel) votersPanel.classList.add('hidden');
            if (resultsPanel) resultsPanel.classList.add('hidden');

            alert('Голосование пропущено. Никто не выбывает.');

            const mafiaAlive = gameState.players.filter(p => p.alive && p.role.type === 'mafia').length;
            const peacefulAlive = gameState.players.filter(p => p.alive && p.role.type === 'peaceful').length;

            if (mafiaAlive === 0) {
                triggerGameOver('peaceful');
                return;
            }

            if (mafiaAlive >= peacefulAlive) {
                triggerGameOver('mafia');
                return;
            }

            if (confirm('Перейти к следующей ночи?')) {
                startNightPhase();
            }
        });
    }

    // Рестарт игры
    document.getElementById('btn-restart-game').addEventListener('click', () => {
        location.reload();
    });

    document.getElementById('btn-help').addEventListener('click', () => {
        showHelpModal();
    });

    const btnPlayers = document.getElementById('btn-players');
    if (btnPlayers) {
        btnPlayers.addEventListener('click', () => {
            showPlayersModal();
        });
    }

    const closeModals = document.querySelectorAll('.close-modal');
    closeModals.forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            const modal = closeBtn.closest('.modal');
            if (modal) modal.classList.remove('active');
        });
    });

    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });
    });
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
    gameState.currentScreen = screenId;
}

function setupRolesScreen() {
    const suggested = getSuggestedRoles(gameState.playerCount);
    const suggestedDiv = document.getElementById('suggested-roles');
    suggestedDiv.innerHTML = '';

    gameState.selectedRoles = [];
    Object.entries(suggested).forEach(([roleKey, count]) => {
        if (ROLES[roleKey]) {
            for (let i = 0; i < count; i++) {
                gameState.selectedRoles.push(roleKey);
            }
        }
    });

    Object.entries(suggested).forEach(([roleKey, initialCount]) => {
        if (ROLES[roleKey] && initialCount > 0) {
            const tag = document.createElement('div');
            tag.className = `role-tag ${ROLES[roleKey].type}`;
            const span = document.createElement('span');
            const updateCount = () => {
                const currentCount = gameState.selectedRoles.filter(r => r === roleKey).length;
                span.textContent = `${ROLES[roleKey].name}: ${currentCount}`;
            };

            tag.appendChild(span);
            updateCount();

            const decreaseBtn = document.createElement('button');
            decreaseBtn.className = 'role-count-btn';
            decreaseBtn.textContent = '−';
            decreaseBtn.addEventListener('click', () => {
                const index = gameState.selectedRoles.indexOf(roleKey);
                if (index > -1) {
                    gameState.selectedRoles.splice(index, 1);
                    updateCount();
                    updateSelectedRolesList();
                }
            });

            const increaseBtn = document.createElement('button');
            increaseBtn.className = 'role-count-btn';
            increaseBtn.textContent = '+';
            increaseBtn.addEventListener('click', () => {
                if (gameState.selectedRoles.length < gameState.playerCount) {
                    gameState.selectedRoles.push(roleKey);
                    updateCount();
                    updateSelectedRolesList();
                } else {
                    alert('Достигнуто максимальное количество ролей');
                }
            });

            tag.appendChild(decreaseBtn);
            tag.appendChild(increaseBtn);
            suggestedDiv.appendChild(tag);
        }
    });

    const availableDiv = document.getElementById('available-roles');
    availableDiv.innerHTML = '';

    const specialRoles = ['mayor', 'jester', 'random'];
    specialRoles.forEach(roleKey => {
        const button = document.createElement('button');
        button.className = 'role-button';
        button.textContent = ROLES[roleKey].name;
        button.addEventListener('click', () => {
            if (gameState.selectedRoles.length < gameState.playerCount) {
                gameState.selectedRoles.push(roleKey);
                updateSelectedRolesList();
                updateAvailableRoles();
            } else {
                alert('Достигнуто максимальное количество ролей');
            }
        });
        availableDiv.appendChild(button);
    });

    updateSelectedRolesList();
}

function updateSelectedRolesList() {
    const selectedDiv = document.getElementById('selected-roles-list');
    selectedDiv.innerHTML = '';

    const roleCounts = {};
    gameState.selectedRoles.forEach(roleKey => {
        roleCounts[roleKey] = (roleCounts[roleKey] || 0) + 1;
    });

    Object.entries(roleCounts).forEach(([roleKey, count]) => {
        const roleItem = document.createElement('div');
        roleItem.className = 'selected-role';
        roleItem.innerHTML = `
            <span>${ROLES[roleKey].name} (${count})</span>
            <button class="remove-role" data-role="${roleKey}">×</button>
        `;
        roleItem.querySelector('.remove-role').addEventListener('click', () => {
            const index = gameState.selectedRoles.indexOf(roleKey);
            if (index > -1) {
                gameState.selectedRoles.splice(index, 1);
                updateSelectedRolesList();
                updateAvailableRoles();
            }
        });
        selectedDiv.appendChild(roleItem);
    });
}

function updateAvailableRoles() {
    const availableDiv = document.getElementById('available-roles');
    const buttons = availableDiv.querySelectorAll('.role-button');
    buttons.forEach(button => {
        button.disabled = gameState.selectedRoles.length >= gameState.playerCount;
    });
}

function setupNamesScreen() {
    const playersList = document.getElementById('players-list');
    playersList.innerHTML = '';

    for (let i = 0; i < gameState.playerCount; i++) {
        const inputDiv = document.createElement('div');
        inputDiv.className = 'player-input';
        inputDiv.innerHTML = `
            <label>Игрок ${i + 1}:</label>
            <input type="text" placeholder="Введите имя" required>
        `;
        playersList.appendChild(inputDiv);
    }
}

function distributeRoles() {
    const rolesToDistribute = [...gameState.selectedRoles];
    const randomRoles = ['mayor', 'jester'];
    rolesToDistribute.forEach((roleKey, index) => {
        if (roleKey === 'random') {
            const randomRole = randomRoles[Math.floor(Math.random() * randomRoles.length)];
            rolesToDistribute[index] = randomRole;
        }
    });

    shuffleArray(rolesToDistribute);

    gameState.players.forEach((player, index) => {
        player.role = ROLES[rolesToDistribute[index]];
    });
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function setupAssignmentScreen() {
    gameState.currentPlayerIndex = 0;
    updateAssignmentScreen();
}

function updateAssignmentScreen() {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    document.getElementById('current-player-name').textContent = currentPlayer.name;
    document.getElementById('current-index').textContent = gameState.currentPlayerIndex + 1;
    document.getElementById('total-players').textContent = gameState.players.length;
}

function setupRolesOverview() {
    const rolesList = document.getElementById('roles-list');
    const peacefulList = document.getElementById('peaceful-list');
    rolesList.innerHTML = '';
    peacefulList.innerHTML = '';

    const rolePlayers = {};
    const peacefulPlayers = [];

    gameState.players.forEach(player => {
        if (player.role.type === 'peaceful' && player.role.name === 'Мирный житель') {
            peacefulPlayers.push(player);
        } else {
            if (!rolePlayers[player.role.name]) {
                rolePlayers[player.role.name] = [];
            }
            rolePlayers[player.role.name].push(player);
        }
    });

    Object.entries(rolePlayers).sort((a, b) => {
        if (a[0] === 'Мафия') return -1;
        if (b[0] === 'Мафия') return 1;
        return a[0].localeCompare(b[0]);
    }).forEach(([roleName, players]) => {
        players.forEach(player => {
            const item = document.createElement('div');
            item.className = `role-item ${player.role.type}`;
            item.innerHTML = `
                <div class="role-name">${roleName}</div>
                <div class="player-name">${player.name}</div>
            `;
            rolesList.appendChild(item);
        });
    });

    peacefulPlayers.forEach(player => {
        const item = document.createElement('div');
        item.className = 'role-item peaceful';
        item.innerHTML = `
            <div class="role-name">Мирный житель</div>
            <div class="player-name">${player.name}</div>
        `;
        peacefulList.appendChild(item);
    });
}

function startNightPhase() {
    gameState.nightPhase = {
        currentRoleIndex: 0,
        actions: {},
        results: {}
    };

    const nightSummary = document.getElementById('night-summary');
    const nightResults = document.getElementById('night-results');
    const nightSelection = document.getElementById('night-selection');
    const nightText = document.getElementById('night-text');
    const nextBtn = document.getElementById('btn-next-night-action');
    const oldSkip = document.getElementById('btn-skip-sheriff');

    if (oldSkip) oldSkip.remove();
    if (nightSummary) nightSummary.classList.add('hidden');
    if (nightResults) nightResults.innerHTML = '';
    if (nightSelection) nightSelection.classList.add('hidden');
    if (nightText) nightText.textContent = '';
    if (nextBtn) nextBtn.classList.add('hidden');

    const nightRoles = [];
    const seenRoles = new Set();

    gameState.players
        .filter(p => p.role.nightAction && p.alive)
        .sort((a, b) => a.role.nightOrder - b.role.nightOrder)
        .forEach(player => {
            if (player.role.name === 'Мафия') {
                if (!seenRoles.has('Мафия')) {
                    nightRoles.push(player);
                    seenRoles.add('Мафия');
                }
            } else {
                nightRoles.push(player);
            }
        });

    gameState.nightPhase.nightRoles = nightRoles;
    showScreen('screen-night');
    processNextNightAction();
}

function processNextNightAction() {
    const nightPhase = gameState.nightPhase;
    const nightRoles = nightPhase.nightRoles;
    const oldSkipBtn = document.getElementById('btn-skip-sheriff');
    if (oldSkipBtn) oldSkipBtn.remove();

    if (!nightRoles || nightPhase.currentRoleIndex >= nightRoles.length) {
        showNightResults();
        return;
    }

    const currentRolePlayer = nightRoles[nightPhase.currentRoleIndex];

    if (!currentRolePlayer) {
        nightPhase.currentRoleIndex++;
        processNextNightAction();
        return;
    }

    const role = currentRolePlayer.role;

    if (!currentRolePlayer.alive) {
        const nt = document.getElementById('night-text');
        const nsel = document.getElementById('night-selection');
        if (nt) nt.textContent = `${role.name} (${currentRolePlayer.name}) просыпается, но он убит.`;

        if (nsel) {
            nsel.classList.remove('hidden');
            nsel.innerHTML = '';
            const skipBtn = document.createElement('button');
            skipBtn.className = 'btn-primary';
            skipBtn.textContent = 'Пропустить';
            skipBtn.id = 'btn-skip-dead-role';
            skipBtn.style.marginTop = '20px';

            skipBtn.addEventListener('click', () => {
                if (nightPhase._autoSkipTimer) {
                    clearTimeout(nightPhase._autoSkipTimer);
                    nightPhase._autoSkipTimer = null;
                }
                nightPhase.actions[role.name] = {
                    player: currentRolePlayer.id,
                    target: null,
                    action: role.nightAction,
                    skipped: true
                };
                nsel.classList.add('hidden');
                skipBtn.remove();
                nightPhase.currentRoleIndex++;
                processNextNightAction();
            });
            nsel.appendChild(skipBtn);

            if (nightPhase._autoSkipTimer) clearTimeout(nightPhase._autoSkipTimer);
            nightPhase._autoSkipTimer = setTimeout(() => {
                nightPhase._autoSkipTimer = null;
                if (document.getElementById('btn-skip-dead-role')) {
                    document.getElementById('btn-skip-dead-role').click();
                }
            }, 1200);
        }
        return;
    }

    let instruction = '';
    switch (role.nightAction) {
        case 'kill':
            if (role.name === 'Мафия') {
                const mafiaPlayers = gameState.players.filter(p => p.alive && p.role.name === 'Мафия');
                if (mafiaPlayers.length > 1) {
                    instruction = `Мафия просыпается. Все мафиози (${mafiaPlayers.map(p => p.name).join(', ')}) выбирают жертву.`;
                } else {
                    instruction = `Мафия (${currentRolePlayer.name}) просыпается. Выберите жертву.`;
                }
            } else {
                instruction = `${role.name} (${currentRolePlayer.name}) просыпается. Выберите жертву.`;
            }
            break;
        case 'heal':
            instruction = `Доктор (${currentRolePlayer.name}) просыпается. Выберите кого вылечить.`;
            break;
        case 'check':
            instruction = `Комиссар (${currentRolePlayer.name}) просыпается. Выберите кого проверить на мафию.`;
            break;
        case 'sheriffKill':
            instruction = `Шериф (${currentRolePlayer.name}) просыпается. Выберите кого убить (или пропустите).`;
            break;
        case 'blockVote':
            instruction = `Проститутка (${currentRolePlayer.name}) просыпается. Выберите кого заблокировать.`;
            break;
    }

    document.getElementById('night-text').textContent = instruction;
    document.getElementById('night-selection').classList.remove('hidden');
    document.getElementById('btn-next-night-action').classList.add('hidden');

    if (role.nightAction === 'sheriffKill') {
        const oldSkipBtn = document.getElementById('btn-skip-sheriff');
        if (oldSkipBtn) oldSkipBtn.remove();

        const skipBtn = document.createElement('button');
        skipBtn.className = 'btn-primary';
        skipBtn.textContent = 'Пропустить';
        skipBtn.style.marginTop = '20px';
        skipBtn.id = 'btn-skip-sheriff';
        skipBtn.addEventListener('click', () => {
            nightPhase.actions[role.name] = {
                player: currentRolePlayer.id,
                target: null,
                action: 'sheriffKill',
                skipped: true
            };
            document.getElementById('night-selection').classList.add('hidden');
            skipBtn.remove();
            document.getElementById('btn-next-night-action').classList.remove('hidden');
        });
        document.getElementById('night-selection').appendChild(skipBtn);
    }

    const playersList = document.getElementById('night-players-list');
    playersList.innerHTML = '';

    gameState.players.forEach(player => {
        if (!player.alive) return;
        if (role.nightAction === 'sheriffKill' && player.id === currentRolePlayer.id) return;

        const card = document.createElement('div');
        card.className = 'player-card';
        card.textContent = player.name;
        card.dataset.playerId = player.id;

        card.addEventListener('click', () => {
            if (card.classList.contains('selected')) {
                card.classList.remove('selected');
                delete nightPhase.actions[role.name];
                document.getElementById('btn-next-night-action').classList.add('hidden');
                const resultDiv = document.getElementById('night-check-result');
                if (resultDiv) resultDiv.remove();
            } else {
                playersList.querySelectorAll('.player-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');

                nightPhase.actions[role.name] = {
                    player: currentRolePlayer.id,
                    target: player.id,
                    action: role.nightAction
                };

                if (role.nightAction === 'check') {
                    const isMafia = player.role.type === 'mafia';
                    const resultDiv = document.createElement('div');
                    resultDiv.id = 'night-check-result';
                    resultDiv.className = 'night-check-result';
                    resultDiv.style.cssText = 'margin: 20px 0; padding: 15px; border-radius: 10px; font-size: 1.3em; font-weight: bold; text-align: center;';
                    resultDiv.style.background = isMafia ? '#f8d7da' : '#d4edda';
                    resultDiv.style.color = isMafia ? '#721c24' : '#155724';
                    resultDiv.textContent = isMafia ? '🔴 МАФИЯ!' : '🟢 Мирный житель';
                    document.getElementById('night-selection').appendChild(resultDiv);
                }

                if (role.nightAction === 'sheriffKill') {
                    const skipBtn = document.getElementById('btn-skip-sheriff');
                    if (skipBtn) skipBtn.remove();
                }

                document.getElementById('btn-next-night-action').classList.remove('hidden');
            }
        });

        playersList.appendChild(card);
    });

    if (nightPhase.actions[role.name]) {
        const selectedCard = playersList.querySelector(`[data-player-id="${nightPhase.actions[role.name].target}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
            document.getElementById('btn-next-night-action').classList.remove('hidden');
        }
    }
}

// Обработка кнопки "Далее" в ночной фазе
document.addEventListener('click', (e) => {
    if (e.target.id === 'btn-next-night-action') {
        const nightPhase = gameState.nightPhase;
        const currentRolePlayer = nightPhase.nightRoles[nightPhase.currentRoleIndex];

        if (!currentRolePlayer) {
            nightPhase.currentRoleIndex++;
            processNextNightAction();
            return;
        }

        if (currentRolePlayer && !nightPhase.actions[currentRolePlayer.role.name]) {
            if (currentRolePlayer.role.nightAction && currentRolePlayer.role.nightAction !== 'sheriffKill') {
                alert('Выберите игрока перед продолжением');
                return;
            }
        }

        if (currentRolePlayer && currentRolePlayer.alive) {
            document.getElementById('night-text').textContent =
                `${currentRolePlayer.role.name} (${currentRolePlayer.name}) засыпает.`;
            document.getElementById('night-selection').classList.add('hidden');
            const resultDiv = document.getElementById('night-check-result');
            if (resultDiv) resultDiv.remove();
            document.getElementById('btn-next-night-action').classList.add('hidden');

            setTimeout(() => {
                nightPhase.currentRoleIndex++;
                processNextNightAction();
            }, 1000);
        } else {
            nightPhase.currentRoleIndex++;
            processNextNightAction();
        }
    }
});

function showNightResults() {
    const nightPhase = gameState.nightPhase;
    const results = calculateNightResults();

    document.getElementById('night-selection').classList.add('hidden');
    document.getElementById('btn-next-night-action').classList.add('hidden');
    document.getElementById('night-summary').classList.remove('hidden');

    const skipBtn = document.getElementById('btn-skip-sheriff');
    if (skipBtn) skipBtn.remove();

    const resultsDiv = document.getElementById('night-results');
    resultsDiv.innerHTML = '';

    if (results.killed.length > 0) {
        results.killed.forEach(playerName => {
            const item = document.createElement('div');
            item.className = 'night-result-item killed';
            item.textContent = `☠️ ${playerName} убит(а)`;
            resultsDiv.appendChild(item);
        });
    }

    if (results.healed.length > 0) {
        results.healed.forEach(playerName => {
            const item = document.createElement('div');
            item.className = 'night-result-item healed';
            item.textContent = `💚 ${playerName} вылечен(а)`;
            resultsDiv.appendChild(item);
        });
    }

    if (results.compensated.length > 0) {
        results.compensated.forEach(playerName => {
            const item = document.createElement('div');
            item.className = 'night-result-item healed';
            item.textContent = `✅ ${playerName} был(а) убит(а), но вылечен(а)`;
            resultsDiv.appendChild(item);
        });
    }

    if (results.prostituteBlocks && results.prostituteBlocks.length > 0) {
        results.prostituteBlocks.forEach(({ blocker, blocked }) => {
            const item = document.createElement('div');
            item.className = 'night-result-item alibi';
            // ИЗМЕНЕНИЕ: Не показываем, кто заблокировал
            item.textContent = `🔒 ${blocked} заблокирован(а)`;
            resultsDiv.appendChild(item);
        });
    }

    results.killed.forEach(playerName => {
        const player = gameState.players.find(p => p.name === playerName);
        if (player && !results.compensated.includes(playerName)) {
            player.alive = false;
        }
    });

    document.getElementById('night-text').textContent = 'Итоги ночи:';

    const mafiaAlive = gameState.players.filter(p => p.alive && p.role.type === 'mafia').length;
    const peacefulAlive = gameState.players.filter(p => p.alive && p.role.type === 'peaceful').length;

    if (mafiaAlive === 0) {
        triggerGameOver('peaceful');
        const endNightBtn = document.getElementById('btn-end-night');
        if (endNightBtn) endNightBtn.disabled = true;
        return;
    }

    if (mafiaAlive >= peacefulAlive) {
        triggerGameOver('mafia');
        const endNightBtn = document.getElementById('btn-end-night');
        if (endNightBtn) endNightBtn.disabled = true;
        return;
    }
}

function calculateNightResults() {
    const nightPhase = gameState.nightPhase;
    const results = {
        killed: [], healed: [], compensated: [], prostituteBlocks: [], checks: [], sheriffKills: []
    };

    const kills = [];
    const heals = [];
    const blocks = [];
    const checks = [];

    Object.values(nightPhase.actions).forEach(action => {
        if (action.action === 'sheriffKill' && action.skipped) return;

        const targetPlayer = gameState.players.find(p => p.id === action.target);
        const actorPlayer = gameState.players.find(p => p.id === action.player);
        if (!targetPlayer || !actorPlayer) return;

        switch (action.action) {
            case 'kill':
                kills.push({ killer: actorPlayer.name, victim: targetPlayer.name });
                break;
            case 'heal':
                heals.push(targetPlayer.name);
                break;
            case 'check':
                checks.push({ checker: actorPlayer.name, checked: targetPlayer.name });
                break;
            case 'sheriffKill':
                if (targetPlayer.role.type === 'mafia') {
                    kills.push({ killer: actorPlayer.name, victim: targetPlayer.name, source: 'sheriff' });
                } else {
                    kills.push({ killer: actorPlayer.name, victim: actorPlayer.name, source: 'sheriff', target: targetPlayer.name });
                }
                break;
            case 'blockVote':
                blocks.push({ blocker: actorPlayer.name, blocked: targetPlayer.name });
                gameState.prostituteBlock = targetPlayer.id;
                break;
        }
    });

    const killedNames = kills.map(k => k.victim);
    killedNames.forEach(killed => {
        if (heals.includes(killed)) {
            results.compensated.push(killed);
        } else {
            results.killed.push(killed);
        }
    });

    heals.forEach(healed => {
        if (!killedNames.includes(healed)) results.healed.push(healed);
    });

    results.prostituteBlocks = blocks;
    results.checks = checks;
    return results;
}

function startVoting() {
    gameState.voting = { votes: {}, currentTarget: null, currentVoters: [] };
    showScreen('screen-voting');
    setupVotingScreen();
}

function setupVotingScreen() {
    const targetList = document.getElementById('voting-target-list');
    targetList.innerHTML = '';

    const alivePlayers = gameState.players.filter(p => p.alive);
    if (alivePlayers.length === 0) return;

    alivePlayers.forEach(player => {
        const card = document.createElement('div');
        card.className = 'player-card';
        let voteCount = 0;
        if (gameState.voting.votes[player.id]) {
            gameState.voting.votes[player.id].forEach(voterId => {
                const voter = gameState.players.find(p => p.id === voterId);
                if (voter) {
                    voteCount += voter.role.votingPower ? voter.role.votingPower : 1;
                }
            });
        }
        card.innerHTML = `<div>${player.name}</div><div style="font-size: 0.8em; color: #666;">Голосов: ${voteCount}</div>`;
        card.dataset.playerId = player.id;

        card.addEventListener('click', () => {
            if (gameState.voting.currentTarget !== null) {
                const currentTargetId = gameState.voting.currentTarget;
                if (gameState.voting.currentVoters && gameState.voting.currentVoters.length > 0) {
                    if (!gameState.voting.votes[currentTargetId]) gameState.voting.votes[currentTargetId] = [];
                    gameState.voting.votes[currentTargetId] = [...gameState.voting.currentVoters];
                }
            }
            targetList.querySelectorAll('.player-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            gameState.voting.currentTarget = player.id;
            document.getElementById('voting-target-name').textContent = player.name;
            document.getElementById('voting-voters').classList.remove('hidden');
            setupVotersList();
            showVotingResults();
        });
        targetList.appendChild(card);
    });
    if (gameState.voting.currentTarget) showVotingResults();
}

function setupVotersList() {
    const votersList = document.getElementById('voting-voters-list');
    votersList.innerHTML = '';
    const targetId = gameState.voting.currentTarget;
    if (!gameState.voting.currentVoters) gameState.voting.currentVoters = [];
    if (gameState.voting.votes[targetId]) gameState.voting.currentVoters = [...gameState.voting.votes[targetId]];
    else gameState.voting.currentVoters = [];

    gameState.players.filter(p => p.alive).forEach(player => {
        // Если заблочен проституткой
        if (gameState.prostituteBlock && player.id === gameState.prostituteBlock) return;

        const card = document.createElement('div');
        card.className = 'player-card';
        card.textContent = player.name;
        card.dataset.playerId = player.id;
        if (gameState.voting.currentVoters.includes(player.id)) card.classList.add('selected');

        card.addEventListener('click', () => {
            if (card.classList.contains('selected')) {
                card.classList.remove('selected');
                const index = gameState.voting.currentVoters.indexOf(player.id);
                if (index > -1) gameState.voting.currentVoters.splice(index, 1);
            } else {
                card.classList.add('selected');
                if (!gameState.voting.currentVoters.includes(player.id)) gameState.voting.currentVoters.push(player.id);
            }
        });
        votersList.appendChild(card);
    });
}

function confirmVote() {
    if (gameState.voting.currentTarget === null) {
        alert('Выберите игрока');
        return;
    }
    if (!gameState.voting.currentVoters || gameState.voting.currentVoters.length === 0) {
        alert('Выберите голосующих');
        return;
    }

    const targetId = gameState.voting.currentTarget;
    gameState.voting.currentVoters.forEach(voterId => {
        Object.keys(gameState.voting.votes).forEach(existingTargetId => {
            if (existingTargetId != targetId) {
                const index = gameState.voting.votes[existingTargetId].indexOf(voterId);
                if (index > -1) {
                    gameState.voting.votes[existingTargetId].splice(index, 1);
                    if (gameState.voting.votes[existingTargetId].length === 0) delete gameState.voting.votes[existingTargetId];
                }
            }
        });
    });

    if (!gameState.voting.votes[targetId]) gameState.voting.votes[targetId] = [];
    gameState.voting.currentVoters.forEach(voterId => {
        if (!gameState.voting.votes[targetId].includes(voterId)) gameState.voting.votes[targetId].push(voterId);
    });

    document.getElementById('voting-voters').classList.add('hidden');
    const currentTarget = gameState.voting.currentTarget;
    setupVotingScreen();

    if (currentTarget) {
        gameState.voting.currentTarget = currentTarget;
        const card = document.querySelector(`[data-player-id="${currentTarget}"]`);
        if (card) {
            card.classList.add('selected');
            document.getElementById('voting-target-name').textContent = gameState.players.find(p => p.id === currentTarget)?.name || '';
            document.getElementById('voting-voters').classList.remove('hidden');
            setupVotersList();
        }
    }
    showVotingResults();
}

function showVotingResults() {
    const resultsDiv = document.getElementById('voting-results');
    const resultsList = document.getElementById('voting-results-list');
    if (!resultsDiv || !resultsList) return;
    resultsDiv.classList.remove('hidden');
    resultsList.innerHTML = '';

    const votesArray = Object.entries(gameState.voting.votes).map(([targetId, voterIds]) => {
        const targetPlayer = gameState.players.find(p => p.id === parseInt(targetId));
        if (!targetPlayer) return null;
        let voteCount = 0;
        const voterNames = [];
        voterIds.forEach(voterId => {
            const voter = gameState.players.find(p => p.id === voterId);
            if (voter) {
                voterNames.push(voter.name);
                voteCount += voter.role.votingPower ? voter.role.votingPower : 1;
            }
        });
        return { targetId: parseInt(targetId), targetPlayer, voterNames, voteCount };
    }).filter(item => item !== null).sort((a, b) => b.voteCount - a.voteCount);

    if (votesArray.length === 0) {
        resultsList.innerHTML = '<p>Голосов нет</p>';
        return;
    }

    votesArray.forEach(({ targetId, targetPlayer, voterNames, voteCount }) => {
        const item = document.createElement('div');
        item.className = 'voting-result-item';
        if (gameState.voting.currentTarget === targetId) {
            item.style.border = '3px solid #667eea';
            item.style.background = '#f0f4ff';
        }
        item.innerHTML = `<div class="target">${targetPlayer.name}</div><div class="voters">Голосуют: ${voterNames.join(', ')}</div><div class="votes-count">Голосов: ${voteCount}</div>`;
        resultsList.appendChild(item);
    });
}

function endVoting() {
    let maxVotes = 0;
    let eliminatedPlayer = null;
    let playersWithMaxVotes = [];

    // Проверка на наличие голосов
    if (Object.keys(gameState.voting.votes).length === 0) {
        alert('Голосование не проводилось (нет подтвержденных голосов). Никто не выбывает.');
        return;
    }

    Object.entries(gameState.voting.votes).forEach(([targetId, voterIds]) => {
        // Парсим ID в число, чтобы точно найти игрока
        const tId = parseInt(targetId);

        if (gameState.prostituteBlock && tId === gameState.prostituteBlock) return;

        let voteCount = 0;
        voterIds.forEach(voterId => {
            const voter = gameState.players.find(p => p.id === voterId);
            if (voter && voter.alive) voteCount += (voter.role.votingPower || 1);
        });

        if (voteCount > maxVotes) {
            maxVotes = voteCount;
            eliminatedPlayer = gameState.players.find(p => p.id === tId);
            playersWithMaxVotes = [{ player: eliminatedPlayer, votes: voteCount }];
        } else if (voteCount === maxVotes && voteCount > 0) {
            const player = gameState.players.find(p => p.id === tId);
            if (player) playersWithMaxVotes.push({ player, votes: voteCount });
        }
    });

    if (playersWithMaxVotes.length > 1 && maxVotes > 0) {
        alert(`Ничья! У нескольких игроков (${playersWithMaxVotes.map(p => p.player.name).join(', ')}) одинаковое количество голосов. Переголосуйте.`);
        return;
    }

    if (eliminatedPlayer) {
        if (eliminatedPlayer.role.specialWin === 'voting') {
            triggerGameOver('jester', eliminatedPlayer.name);
            return;
        }

        eliminatedPlayer.alive = false; // Важно: меняем статус на "мертв"
        alert(`${eliminatedPlayer.name} выбывает (${maxVotes} голосов).`);
    } else {
        alert('Никто не выбывает.');
    }

    const mafiaAlive = gameState.players.filter(p => p.alive && p.role.type === 'mafia').length;
    const peacefulAlive = gameState.players.filter(p => p.alive && p.role.type === 'peaceful').length;

    if (mafiaAlive === 0) {
        triggerGameOver('peaceful');
        return;
    }
    if (mafiaAlive >= peacefulAlive) {
        triggerGameOver('mafia');
        return;
    }

    if (confirm('Перейти к следующей ночи?')) {
        startNightPhase();
    }
}

function triggerGameOver(winner, extraName = '') {
    showScreen('screen-game-over');
    const title = document.getElementById('winner-text');
    const list = document.getElementById('final-players-list');

    if (winner === 'peaceful') {
        title.textContent = '🕊️ ПОБЕДА МИРНЫХ ЖИТЕЛЕЙ!';
        title.style.color = '#28a745';
    } else if (winner === 'mafia') {
        title.textContent = '🔫 ПОБЕДА МАФИИ!';
        title.style.color = '#dc3545';
    } else if (winner === 'jester') {
        title.textContent = `🤡 ШУТ (${extraName}) ПОБЕДИЛ!`;
        title.style.color = '#ffc107';
    }

    let html = '<div class="players-list-modal">';
    gameState.players.forEach((player, index) => {
        const roleName = player.role ? ROLES[player.role.type === 'peaceful' && player.role.name !== 'Мирный житель' ? player.role.type : player.role.type].name : '???';
        const displayRole = player.role ? player.role.name : 'Не распределено';
        const roleType = player.role ? player.role.type : '';
        const isDeadClass = player.alive ? '' : 'dead';
        const statusText = player.alive ? 'Жив' : 'Мертв';

        html += `
            <div class="player-item-modal ${roleType} ${isDeadClass}">
                <div class="player-info">
                    <span class="player-number">${index + 1}.</span>
                    <span class="player-name">${player.name}</span>
                </div>
                <div class="player-info">
                    <span style="font-size:0.8em; color:#777; margin-right:10px;">${statusText}</span>
                    <span class="player-role-badge">${displayRole}</span>
                </div>
            </div>`;
    });
    html += '</div>';
    list.innerHTML = html;
}

function showHelpModal() {
    const modal = document.getElementById('help-modal');
    const content = document.getElementById('help-content');
    if (!modal || !content) return;

    let html = '<div class="help-section"><h3>Описание ролей</h3>';
    Object.entries(ROLES).forEach(([key, role]) => {
        if (key === 'peaceful') return;
        html += `<div class="role-help-item ${role.type}"><strong>${role.name}</strong><p>${role.description}</p></div>`;
    });
    html += '</div>';
    content.innerHTML = html;
    modal.classList.add('active');
}

function showPlayersModal() {
    const modal = document.getElementById('players-modal');
    const content = document.getElementById('players-content');
    if (!modal || !content) return;

    let html = '<div class="players-list-modal">';
    if (gameState.players.length === 0) html += '<p style="text-align:center;color:#666;">Список игроков пуст</p>';
    gameState.players.forEach((player, index) => {
        const roleName = player.role ? ROLES[player.role.type === 'peaceful' && player.role.name !== 'Мирный житель' ? player.role.type : player.role.type].name : '???';
        const displayRole = player.role ? player.role.name : 'Не распределено';
        const roleType = player.role ? player.role.type : '';
        const isDeadClass = player.alive ? '' : 'dead';

        html += `
            <div class="player-item-modal ${roleType} ${isDeadClass}">
                <div class="player-info">
                    <span class="player-number">${index + 1}.</span>
                    <span class="player-name">${player.name}</span>
                </div>
                <div class="player-info">
                    <span class="player-role-badge">${displayRole}</span>
                </div>
            </div>`;
    });
    html += '</div>';
    content.innerHTML = html;
    modal.classList.add('active');
}