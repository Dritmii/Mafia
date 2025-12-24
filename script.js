// Определение всех ролей
const ROLES = {
    // Базовые роли
    mafia: {
        name: 'Мафия',
        type: 'mafia',
        nightOrder: 1,
        nightAction: 'kill',
        description: 'Выбирает жертву для убийства'
    },
    doctor: {
        name: 'Доктор',
        type: 'peaceful',
        nightOrder: 2,
        nightAction: 'heal',
        description: 'Выбирает кого вылечить'
    },
    sheriff: {
        name: 'Шериф',
        type: 'peaceful',
        nightOrder: 3,
        nightAction: 'sheriffKill',
        description: 'Может убить игрока ночью. Если убивает мирного - умирает сам. Если мафию - умирает мафия. Может пропустить.'
    },
    commissioner: {
        name: 'Комиссар',
        type: 'peaceful',
        nightOrder: 3,
        nightAction: 'check',
        description: 'Проверяет игрока на мафию'
    },
    peaceful: {
        name: 'Мирный житель',
        type: 'peaceful',
        nightOrder: 999,
        nightAction: null,
        description: 'Обычный житель города'
    },
    
    // Необычные роли
    mayor: {
        name: 'Мэр',
        type: 'peaceful',
        nightOrder: 999,
        nightAction: null,
        description: 'Голос мэра считается как два голоса',
        votingPower: 2
    },
    maniac: {
        name: 'Маньяк',
        type: 'neutral',
        nightOrder: 4,
        nightAction: 'kill',
        description: 'Выбирает жертву для убийства'
    },
    prostitute: {
        name: 'Проститутка',
        type: 'peaceful',
        nightOrder: 5,
        nightAction: 'blockVote',
        description: 'Блокирует возможность голосовать в игрока и ему голосовать'
    },
    random: {
        name: 'Рандом',
        type: 'peaceful',
        nightOrder: 999,
        nightAction: null,
        description: 'Случайная роль: мэр или проститутка',
        isRandom: true
    },
    jester: {
        name: 'Шут',
        type: 'neutral',
        nightOrder: 999,
        nightAction: null,
        description: 'Выигрывает, если его выгнали голосованием',
        specialWin: 'voting'
    }
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
    lawyerDefense: null // Кого защитил адвокат в эту ночь
};

// Рекомендуемое распределение ролей по количеству игроков
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
    
    return suggestions[playerCount] || suggestions[8];
}

// Инициализация
// Intro sequence then initialize
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

    // Helper to show a word for a duration
    const showWord = (word, duration) => {
        return new Promise(resolve => {
            textEl.textContent = word;
            // trigger show
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
        // Первый экран
        await showWord('Мафия', 900);
        // Небольшая пауза
        await new Promise(r => setTimeout(r, 150));
        // Второй экран
        await showWord('Dritmii', 900);
        // Скрываем оверлей полностью
        overlay.style.transition = 'opacity 400ms ease';
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.remove();
            initializeGame();
        }, 450);
    })();
}

function initializeGame() {
    // Экран выбора количества игроков
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

    // Экран настройки ролей
    document.getElementById('btn-next-roles').addEventListener('click', () => {
        if (gameState.selectedRoles.length === 0) {
            alert('Выберите хотя бы одну роль');
            return;
        }
        showScreen('screen-names');
        setupNamesScreen();
    });

    // Экран ввода имен
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

    // Распределение ролей
    document.getElementById('btn-show-role').addEventListener('click', () => {
        const roleDisplay = document.getElementById('role-display');
        const roleText = document.getElementById('role-text');
        const currentPlayer = gameState.players[gameState.currentPlayerIndex];
        
        roleText.textContent = currentPlayer.role.name;
        
        // Добавляем цвет в зависимости от типа роли
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

    // Начать игру
    document.getElementById('btn-start-game').addEventListener('click', () => {
        startNightPhase();
    });

    // Ночная фаза
    document.getElementById('btn-next-night-action').addEventListener('click', () => {
        processNextNightAction();
    });

    document.getElementById('btn-end-night').addEventListener('click', () => {
        showNightResults();
    });

    // Голосование
    document.getElementById('btn-confirm-vote').addEventListener('click', () => {
        confirmVote();
    });

    document.getElementById('btn-end-voting').addEventListener('click', () => {
        endVoting();
    });

    // Кнопка пропуска голосования
    const skipVoteBtn = document.getElementById('btn-skip-vote');
    if (skipVoteBtn) {
        skipVoteBtn.addEventListener('click', () => {
            if (!confirm('Пропустить голосование? Никто не выбывает.')) return;
            // Очистим текущее голосование
            gameState.voting = {
                votes: {},
                currentTarget: null,
                currentVoters: []
            };
            // Скрываем панель голосующих и результаты
            const votersPanel = document.getElementById('voting-voters');
            const resultsPanel = document.getElementById('voting-results');
            if (votersPanel) votersPanel.classList.add('hidden');
            if (resultsPanel) resultsPanel.classList.add('hidden');

            alert('Голосование пропущено. Никто не выбывает.');

            // Проверка условий окончания игры (на случай, если состояние игры изменилось ночью)
            const mafiaAlive = gameState.players.filter(p => p.alive && p.role.type === 'mafia').length;
            const peacefulAlive = gameState.players.filter(p => p.alive && p.role.type === 'peaceful').length;

            if (mafiaAlive === 0) {
                alert('Мирные жители победили!');
                return;
            }

            if (mafiaAlive >= peacefulAlive) {
                alert('Мафия победила!');
                return;
            }

            // Перейти к следующей ночи
            if (confirm('Перейти к следующей ночи?')) {
                startNightPhase();
            }
        });
    }
    
    // Кнопка помощи
    document.getElementById('btn-help').addEventListener('click', () => {
        showHelpModal();
    });
    
    // Закрытие модального окна
    const closeModal = document.querySelector('.close-modal');
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            document.getElementById('help-modal').classList.remove('active');
        });
    }
    
    const helpModal = document.getElementById('help-modal');
    if (helpModal) {
        helpModal.addEventListener('click', (e) => {
            if (e.target.id === 'help-modal') {
                helpModal.classList.remove('active');
            }
        });
    }
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
    
    // Инициализируем выбранные роли на основе рекомендаций
    gameState.selectedRoles = [];
    Object.entries(suggested).forEach(([roleKey, count]) => {
        if (ROLES[roleKey]) {
            for (let i = 0; i < count; i++) {
                gameState.selectedRoles.push(roleKey);
            }
        }
    });
    
    // Показываем рекомендуемое распределение с возможностью изменения
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

    // Показываем доступные необычные роли
    const availableDiv = document.getElementById('available-roles');
    availableDiv.innerHTML = '';
    
    const specialRoles = ['mayor', 'maniac', 'prostitute', 'commissioner', 'random', 'jester'];
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
    // Перемешиваем роли
    const rolesToDistribute = [...gameState.selectedRoles];
    
    // Заменяем рандом на случайную роль (мэр или проститутка)
    const randomRoles = ['mayor', 'prostitute'];
    rolesToDistribute.forEach((roleKey, index) => {
        if (roleKey === 'random') {
            const randomRole = randomRoles[Math.floor(Math.random() * randomRoles.length)];
            rolesToDistribute[index] = randomRole;
        }
    });
    
    shuffleArray(rolesToDistribute);
    
    // Распределяем роли игрокам
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
    
    // Показываем роли (сначала мафия, потом остальные)
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
    
    // Показываем мирных жителей
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
    // Очищаем предыдущие результаты при начале новой ночи
    gameState.nightPhase = {
        currentRoleIndex: 0,
        actions: {},
        results: {} // Очищаем результаты для новой ночи
    };
    // Сброс UI от предыдущей ночи
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
    
    // Сортируем роли по порядку ночи
    // Мафия действует как одна команда, поэтому берем только первого мафиози
    const nightRoles = [];
    const seenRoles = new Set();
    
    // Добавляем все роли с ночными действиями (включая мертвых, чтобы напомнить о них)
    gameState.players
        .filter(p => p.role.nightAction)
        .sort((a, b) => a.role.nightOrder - b.role.nightOrder)
        .forEach(player => {
            // Для мафии добавляем только один раз
            if (player.role.name === 'Мафия') {
                if (!seenRoles.has('Мафия')) {
                    nightRoles.push(player);
                    seenRoles.add('Мафия');
                }
            } else {
                // Для остальных ролей добавляем всех
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
    // Удаляем старые кнопки "Пропустить", если остались от предыдущих ролей
    const oldSkipBtn = document.getElementById('btn-skip-sheriff');
    if (oldSkipBtn) oldSkipBtn.remove();
    
    if (nightPhase.currentRoleIndex >= nightRoles.length) {
        // Все роли обработаны, показываем итоги
        showNightResults();
        return;
    }
    
    const currentRolePlayer = nightRoles[nightPhase.currentRoleIndex];
    const role = currentRolePlayer.role;
    
    // Проверяем, не убит ли игрок
    if (!currentRolePlayer.alive) {
        const nt = document.getElementById('night-text');
        const nsel = document.getElementById('night-selection');
        if (nt) nt.textContent = `${role.name} (${currentRolePlayer.name}) просыпается, но он убит и не может действовать.`;
        // Показываем возможность пропустить (чтобы ведущий явно подтвердил), а не выбор игроков
        if (nsel) {
            nsel.classList.remove('hidden');
            nsel.innerHTML = '';
            const skipBtn = document.createElement('button');
            skipBtn.className = 'btn-primary';
            skipBtn.textContent = 'Пропустить';
            skipBtn.id = 'btn-skip-dead-role';
            skipBtn.style.marginTop = '20px';
            skipBtn.addEventListener('click', () => {
                // Сохраняем пропуск для наглядности
                nightPhase.actions[role.name] = {
                    player: currentRolePlayer.id,
                    target: null,
                    action: role.nightAction,
                    skipped: true
                };
                nsel.classList.add('hidden');
                skipBtn.remove();
                document.getElementById('btn-next-night-action').classList.remove('hidden');
            });
            nsel.appendChild(skipBtn);
        }
        // Не увеличиваем индекс сразу, чтобы пользователь мог нажать "Пропустить/Далее"
        return;
    }
    
    // Показываем инструкцию
    let instruction = '';
    switch (role.nightAction) {
        case 'kill':
            if (role.name === 'Мафия') {
                const mafiaPlayers = gameState.players.filter(p => p.alive && p.role.name === 'Мафия');
                if (mafiaPlayers.length > 1) {
                    instruction = `Мафия просыпается. Все мафиози (${mafiaPlayers.map(p => p.name).join(', ')}) выбирают жертву (можете выбрать одного из мафий для суицида).`;
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
            instruction = `Шериф (${currentRolePlayer.name}) просыпается. Выберите кого убить (можете пропустить, не выбирая никого). Если убьете мирного - умрете сами. Если мафию - умрет мафия. Не можете убить себя.`;
            break;
        case 'blockVote':
            instruction = `Проститутка (${currentRolePlayer.name}) просыпается. Выберите кого заблокировать (блокирует возможность голосовать в него и ему голосовать).`;
            break;
    }
    
    document.getElementById('night-text').textContent = instruction;
    document.getElementById('night-selection').classList.remove('hidden');
    document.getElementById('btn-next-night-action').classList.add('hidden');
    
    // Для шерифа добавляем кнопку "Пропустить"
    if (role.nightAction === 'sheriffKill') {
        // Удаляем старую кнопку, если есть
        const oldSkipBtn = document.getElementById('btn-skip-sheriff');
        if (oldSkipBtn) {
            oldSkipBtn.remove();
        }
        
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
    
    // Показываем список игроков для выбора
    const playersList = document.getElementById('night-players-list');
    playersList.innerHTML = '';
    
    gameState.players.forEach(player => {
        if (!player.alive) return; // Не показываем мертвых
        
        // Для шерифа не показываем его самого
        if (role.nightAction === 'sheriffKill' && player.id === currentRolePlayer.id) {
            return;
        }
        
        const card = document.createElement('div');
        card.className = 'player-card';
        card.textContent = player.name;
        card.dataset.playerId = player.id;
        
        card.addEventListener('click', () => {
            if (card.classList.contains('selected')) {
                card.classList.remove('selected');
                delete nightPhase.actions[role.name];
                document.getElementById('btn-next-night-action').classList.add('hidden');
                // Убираем результат проверки, если был
                const resultDiv = document.getElementById('night-check-result');
                if (resultDiv) {
                    resultDiv.remove();
                }
            } else {
                // Убираем предыдущий выбор для этой роли
                playersList.querySelectorAll('.player-card').forEach(c => {
                    c.classList.remove('selected');
                });
                card.classList.add('selected');
                
                nightPhase.actions[role.name] = {
                    player: currentRolePlayer.id,
                    target: player.id,
                    action: role.nightAction
                };
                
                // Если это проверка комиссара, показываем результат сразу
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
                
                // Убираем кнопку "Пропустить" для шерифа, если был выбор
                if (role.nightAction === 'sheriffKill') {
                    const skipBtn = document.getElementById('btn-skip-sheriff');
                    if (skipBtn) {
                        skipBtn.remove();
                    }
                }
                
                // Показываем кнопку "Далее" после выбора
                document.getElementById('btn-next-night-action').classList.remove('hidden');
            }
        });
        
        playersList.appendChild(card);
    });
    
    // Если уже был выбор для этой роли, показываем его
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
        
        if (currentRolePlayer && !nightPhase.actions[currentRolePlayer.role.name]) {
            // Если роль требует действия, но оно не выбрано
            // Шериф может пропустить (не выбирать никого) - проверка не нужна, есть кнопка
            if (currentRolePlayer.role.nightAction && currentRolePlayer.role.nightAction !== 'sheriffKill') {
                alert('Выберите игрока перед продолжением');
                return;
            }
        }
        
        // Показываем сообщение "засыпает"
        if (currentRolePlayer && currentRolePlayer.alive) {
            document.getElementById('night-text').textContent = 
                `${currentRolePlayer.role.name} (${currentRolePlayer.name}) засыпает.`;
            document.getElementById('night-selection').classList.add('hidden');
            // Убираем результат проверки, если был
            const resultDiv = document.getElementById('night-check-result');
            if (resultDiv) {
                resultDiv.remove();
            }
            document.getElementById('btn-next-night-action').classList.add('hidden');
            
            // Через небольшую задержку переходим к следующей роли
            setTimeout(() => {
                nightPhase.currentRoleIndex++;
                processNextNightAction();
            }, 1500);
        } else {
            // Если роль убита, просто переходим к следующей
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
    
    // Скрываем кнопку "Пропустить", если она была
    const skipBtn = document.getElementById('btn-skip-sheriff');
    if (skipBtn) {
        skipBtn.remove();
    }
    
    const resultsDiv = document.getElementById('night-results');
    resultsDiv.innerHTML = '';
    
    // Убийства
    if (results.killed.length > 0) {
        results.killed.forEach(playerName => {
            const item = document.createElement('div');
            item.className = 'night-result-item killed';
            item.textContent = `☠️ ${playerName} убит(а)`;
            resultsDiv.appendChild(item);
        });
    }
    
    // Лечение
    if (results.healed.length > 0) {
        results.healed.forEach(playerName => {
            const item = document.createElement('div');
            item.className = 'night-result-item healed';
            item.textContent = `💚 ${playerName} вылечен(а)`;
            resultsDiv.appendChild(item);
        });
    }
    
    // Компенсация
    if (results.compensated.length > 0) {
        results.compensated.forEach(playerName => {
            const item = document.createElement('div');
            item.className = 'night-result-item healed';
            item.textContent = `✅ ${playerName} был(а) убит(а), но вылечен(а)`;
            resultsDiv.appendChild(item);
        });
    }
    
    // Блокировка проститутки (голосование)
    if (results.prostituteBlocks && results.prostituteBlocks.length > 0) {
        results.prostituteBlocks.forEach(({blocker, blocked}) => {
            const item = document.createElement('div');
            item.className = 'night-result-item alibi';
            item.textContent = `🔒 ${blocker} заблокировал(а) ${blocked} (не может голосовать и в него не могут голосовать)`;
            resultsDiv.appendChild(item);
        });
    }
    
    // Проверки комиссара (только для ведущего)
    if (results.checks && results.checks.length > 0) {
        results.checks.forEach(({checker, checked, isMafia}) => {
            const item = document.createElement('div');
            item.className = 'night-result-item alibi';
            item.textContent = `🔍 ${checker} проверил(а) ${checked}: ${isMafia ? 'МАФИЯ' : 'Мирный'}`;
            resultsDiv.appendChild(item);
        });
    }
    
    // Убийства шерифа (обрабатываются утром, не показываем здесь)
    
    // Обновляем состояние игроков
    results.killed.forEach(playerName => {
        const player = gameState.players.find(p => p.name === playerName);
        if (player && !results.compensated.includes(playerName)) {
            player.alive = false;
        }
    });
    
    document.getElementById('night-text').textContent = 'Итоги ночи:';
    
    // Проверяем условия окончания игры сразу после ночи
    const mafiaAlive = gameState.players.filter(p => p.alive && p.role.type === 'mafia').length;
    const peacefulAlive = gameState.players.filter(p => p.alive && p.role.type === 'peaceful').length;

    if (mafiaAlive === 0) {
        alert('Мирные жители победили!');
        // Скрываем кнопку завершения ночи и блокируем дальнейшие действия
        const endNightBtn = document.getElementById('btn-end-night');
        if (endNightBtn) endNightBtn.disabled = true;
        return;
    }

    if (mafiaAlive >= peacefulAlive) {
        alert('Мафия победила!');
        const endNightBtn = document.getElementById('btn-end-night');
        if (endNightBtn) endNightBtn.disabled = true;
        return;
    }

    // Не сохраняем результаты - они будут очищены при следующей ночи
}

function calculateNightResults() {
    const nightPhase = gameState.nightPhase;
    const results = {
        killed: [],
        healed: [],
        compensated: [],
        prostituteBlocks: [],
        checks: [],
        sheriffKills: []
    };
    
    // Собираем все действия
    const kills = [];
    const heals = [];
    const blocks = [];
    const checks = [];
    const sheriffKills = [];
    
    Object.values(nightPhase.actions).forEach(action => {
        // Шериф может пропустить (не выбирать никого)
        if (action.action === 'sheriffKill' && action.skipped) {
            return;
        }
        
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
                checks.push({ checker: actorPlayer.name, checked: targetPlayer.name, isMafia: targetPlayer.role.type === 'mafia' });
                break;
            case 'sheriffKill':
                sheriffKills.push({ sheriff: actorPlayer.name, target: targetPlayer.name, targetType: targetPlayer.role.type });
                break;
            case 'blockVote':
                blocks.push({ blocker: actorPlayer.name, blocked: targetPlayer.name });
                break;
        }
    });
    
    // Определяем убийства
    const killedNames = kills.map(k => k.victim);
    killedNames.forEach(killed => {
        if (heals.includes(killed)) {
            results.compensated.push(killed);
        } else {
            results.killed.push(killed);
        }
    });
    
    // Лечение
    heals.forEach(healed => {
        if (!killedNames.includes(healed)) {
            results.healed.push(healed);
        }
    });
    
    // Блокировка проститутки (голосование)
    results.prostituteBlocks = blocks;
    
    // Проверки комиссара
    results.checks = checks;
    
    // Убийства шерифа (обрабатываются утром)
    results.sheriffKills = sheriffKills;
    
    return results;
}

function startVoting() {
    gameState.voting = {
        votes: {},
        currentTarget: null,
        currentVoters: []
    };
    
    showScreen('screen-voting');
    setupVotingScreen();
}

function setupVotingScreen() {
    const targetList = document.getElementById('voting-target-list');
    targetList.innerHTML = '';
    
    const alivePlayers = gameState.players.filter(p => p.alive);
    
    if (alivePlayers.length === 0) {
        document.getElementById('voting-instruction').textContent = 'Все игроки мертвы. Игра окончена.';
        return;
    }
    
    alivePlayers.forEach(player => {
        const card = document.createElement('div');
        card.className = 'player-card';
        
        // Показываем количество голосов для этого игрока (с учетом мэра)
        let voteCount = 0;
        if (gameState.voting.votes[player.id]) {
            gameState.voting.votes[player.id].forEach(voterId => {
                const voter = gameState.players.find(p => p.id === voterId);
                if (voter) {
                    if (voter.role.votingPower) {
                        voteCount += voter.role.votingPower;
                    } else {
                        voteCount += 1;
                    }
                }
            });
        }
        card.innerHTML = `<div>${player.name}</div><div style="font-size: 0.8em; color: #666;">Голосов: ${voteCount}</div>`;
        card.dataset.playerId = player.id;
        
        card.addEventListener('click', () => {
            // Сохраняем текущие голоса перед переключением
            if (gameState.voting.currentTarget !== null) {
                const currentTargetId = gameState.voting.currentTarget;
                if (gameState.voting.currentVoters && gameState.voting.currentVoters.length > 0) {
                    // Сохраняем голоса за текущего игрока
                    if (!gameState.voting.votes[currentTargetId]) {
                        gameState.voting.votes[currentTargetId] = [];
                    }
                    // Обновляем голоса - удаляем старые и добавляем новые
                    gameState.voting.votes[currentTargetId] = [...gameState.voting.currentVoters];
                }
            }
            
            targetList.querySelectorAll('.player-card').forEach(c => {
                c.classList.remove('selected');
            });
            card.classList.add('selected');
            
            gameState.voting.currentTarget = player.id;
            document.getElementById('voting-target-name').textContent = player.name;
            document.getElementById('voting-voters').classList.remove('hidden');
            
            setupVotersList();
            showVotingResults(); // Показываем результаты голосования
        });
        
        targetList.appendChild(card);
    });
    
    // Показываем результаты голосования, если есть выбранный игрок
    if (gameState.voting.currentTarget) {
        showVotingResults();
    }
}

function setupVotersList() {
    const votersList = document.getElementById('voting-voters-list');
    votersList.innerHTML = '';
    
    // Восстанавливаем сохраненные голоса для текущего игрока
    const targetId = gameState.voting.currentTarget;
    if (!gameState.voting.currentVoters) {
        gameState.voting.currentVoters = [];
    }
    
    // Если есть сохраненные голоса для этого игрока, восстанавливаем их
    if (gameState.voting.votes[targetId]) {
        gameState.voting.currentVoters = [...gameState.voting.votes[targetId]];
    } else {
        gameState.voting.currentVoters = [];
    }
    
    gameState.players.filter(p => p.alive).forEach(player => {
        // Пропускаем заблокированного проституткой игрока
        if (gameState.prostituteBlock && player.id === gameState.prostituteBlock) {
            return;
        }
        
        const card = document.createElement('div');
        card.className = 'player-card';
        card.textContent = player.name;
        card.dataset.playerId = player.id;
        
        // Если этот игрок уже голосует за текущего, выделяем его
        if (gameState.voting.currentVoters.includes(player.id)) {
            card.classList.add('selected');
        }
        
        card.addEventListener('click', () => {
            if (card.classList.contains('selected')) {
                card.classList.remove('selected');
                const index = gameState.voting.currentVoters.indexOf(player.id);
                if (index > -1) {
                    gameState.voting.currentVoters.splice(index, 1);
                }
            } else {
                card.classList.add('selected');
                if (!gameState.voting.currentVoters.includes(player.id)) {
                    gameState.voting.currentVoters.push(player.id);
                }
            }
        });
        
        votersList.appendChild(card);
    });
}

function confirmVote() {
    // Проверяем, что выбрана цель голосования
    if (gameState.voting.currentTarget === null || gameState.voting.currentTarget === undefined) {
        alert('Выберите игрока, против которого голосуют');
        return;
    }
    
    // Проверяем, что есть голосующие
    if (!gameState.voting.currentVoters || gameState.voting.currentVoters.length === 0) {
        alert('Выберите хотя бы одного голосующего');
        return;
    }
    
    // Проверяем, что все голосующие живы
    const deadVoters = gameState.voting.currentVoters.filter(voterId => {
        const voter = gameState.players.find(p => p.id === voterId);
        return !voter || !voter.alive;
    });
    
    if (deadVoters.length > 0) {
        alert('Нельзя голосовать за мертвых игроков');
        return;
    }
    
    // Сохраняем голосование
    const targetId = gameState.voting.currentTarget;
    
    // Удаляем голоса этих игроков за других целей (каждый игрок может голосовать только за одного)
    gameState.voting.currentVoters.forEach(voterId => {
        Object.keys(gameState.voting.votes).forEach(existingTargetId => {
            if (existingTargetId != targetId) {
                const index = gameState.voting.votes[existingTargetId].indexOf(voterId);
                if (index > -1) {
                    gameState.voting.votes[existingTargetId].splice(index, 1);
                    // Если массив пуст, удаляем его
                    if (gameState.voting.votes[existingTargetId].length === 0) {
                        delete gameState.voting.votes[existingTargetId];
                    }
                }
            }
        });
    });
    
    // Сохраняем голоса за текущую цель
    if (!gameState.voting.votes[targetId]) {
        gameState.voting.votes[targetId] = [];
    }
    // Добавляем только тех, кого еще нет
    gameState.voting.currentVoters.forEach(voterId => {
        if (!gameState.voting.votes[targetId].includes(voterId)) {
            gameState.voting.votes[targetId].push(voterId);
        }
    });
    
    // Не сбрасываем выбор, чтобы можно было вернуться и изменить
    // Просто скрываем панель выбора голосующих
    document.getElementById('voting-voters').classList.add('hidden');
    
    // Обновляем экран (сохраняем текущий выбор)
    const currentTarget = gameState.voting.currentTarget;
    setupVotingScreen();
    
    // Восстанавливаем выбор
    if (currentTarget) {
        gameState.voting.currentTarget = currentTarget;
        const card = document.querySelector(`[data-player-id="${currentTarget}"]`);
        if (card) {
            card.classList.add('selected');
            document.getElementById('voting-target-name').textContent = 
                gameState.players.find(p => p.id === currentTarget)?.name || '';
            document.getElementById('voting-voters').classList.remove('hidden');
            setupVotersList();
        }
    }
    
    // Показываем результаты
    showVotingResults();
}

function showVotingResults() {
    const resultsDiv = document.getElementById('voting-results');
    const resultsList = document.getElementById('voting-results-list');
    if (!resultsDiv || !resultsList) return;
    
    resultsDiv.classList.remove('hidden');
    resultsList.innerHTML = '';
    
    // Сортируем по количеству голосов (от большего к меньшему)
    const votesArray = Object.entries(gameState.voting.votes)
        .map(([targetId, voterIds]) => {
            const targetPlayer = gameState.players.find(p => p.id === parseInt(targetId));
            if (!targetPlayer) return null;
            
            let voteCount = 0;
            const voterNames = [];
            
            voterIds.forEach(voterId => {
                const voter = gameState.players.find(p => p.id === voterId);
                if (voter) {
                    voterNames.push(voter.name);
                    // Проверяем, является ли голосующий мэром
                    if (voter.role.votingPower) {
                        voteCount += voter.role.votingPower;
                    } else {
                        voteCount += 1;
                    }
                }
            });
            
            return {
                targetId: parseInt(targetId),
                targetPlayer,
                voterNames,
                voteCount
            };
        })
        .filter(item => item !== null)
        .sort((a, b) => b.voteCount - a.voteCount);
    
    if (votesArray.length === 0) {
        resultsList.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">Голосов пока нет</p>';
        return;
    }
    
    votesArray.forEach(({targetId, targetPlayer, voterNames, voteCount}) => {
        const item = document.createElement('div');
        item.className = 'voting-result-item';
        
        // Выделяем текущего выбранного игрока
        if (gameState.voting.currentTarget === targetId) {
            item.style.border = '3px solid #667eea';
            item.style.background = '#f0f4ff';
        }
        
        item.innerHTML = `
            <div class="target">${targetPlayer.name}</div>
            <div class="voters">Голосуют: ${voterNames.length > 0 ? voterNames.join(', ') : 'никто'}</div>
            <div class="votes-count">Голосов: ${voteCount}</div>
        `;
        resultsList.appendChild(item);
    });
}

function endVoting() {
    // Определяем, кто выбыл (игрок с наибольшим количеством голосов)
    let maxVotes = 0;
    let eliminatedPlayer = null;
    let playersWithMaxVotes = []; // Для проверки ничьей
    
    Object.entries(gameState.voting.votes).forEach(([targetId, voterIds]) => {
        // Проверяем блокировку проститутки
        if (gameState.prostituteBlock && parseInt(targetId) === gameState.prostituteBlock) {
            return; // Этот игрок заблокирован проституткой, пропускаем
        }
        
        // Проверяем, не заблокирован ли голосующий проституткой
        const validVoters = voterIds.filter(voterId => {
            return !gameState.prostituteBlock || voterId !== gameState.prostituteBlock;
        });
        
        if (validVoters.length === 0) {
            return; // Нет валидных голосующих
        }
        
        let voteCount = 0;
        validVoters.forEach(voterId => {
            const voter = gameState.players.find(p => p.id === voterId);
            if (voter && voter.alive) {
                if (voter.role.votingPower) {
                    voteCount += voter.role.votingPower;
                } else {
                    voteCount += 1;
                }
            }
        });
        
        if (voteCount > maxVotes) {
            maxVotes = voteCount;
            eliminatedPlayer = gameState.players.find(p => p.id === parseInt(targetId));
            playersWithMaxVotes = [{player: eliminatedPlayer, votes: voteCount}];
        } else if (voteCount === maxVotes && voteCount > 0) {
            // Если равное количество голосов
            const player = gameState.players.find(p => p.id === parseInt(targetId));
            if (player) {
                playersWithMaxVotes.push({player, votes: voteCount});
            }
        }
    });
    
    // Проверяем на ничью (несколько игроков с максимальным количеством голосов)
    if (playersWithMaxVotes.length > 1 && maxVotes > 0) {
        const playerNames = playersWithMaxVotes.map(p => p.player.name).join(', ');
        alert(`Ничья! У игроков ${playerNames} одинаковое количество голосов (${maxVotes}). Необходимо переголосовать.`);
        return;
    }
    
    // Проверяем победу шута
    if (eliminatedPlayer && eliminatedPlayer.role.specialWin === 'voting') {
        alert(`🎭 Шут (${eliminatedPlayer.name}) выиграл! Его выгнали голосованием.`);
        return;
    }
    
    if (eliminatedPlayer) {
        // Проверяем, не заблокирован ли игрок проституткой
        if (gameState.prostituteBlock && eliminatedPlayer.id === gameState.prostituteBlock) {
            alert(`${eliminatedPlayer.name} заблокирован проституткой и не может быть выгнан.`);
            // Ищем следующего по голосам
            maxVotes = 0;
            eliminatedPlayer = null;
            playersWithMaxVotes = [];
            Object.entries(gameState.voting.votes).forEach(([targetId, voterIds]) => {
                if (parseInt(targetId) === gameState.prostituteBlock) return;
                let voteCount = 0;
                voterIds.forEach(voterId => {
                    const voter = gameState.players.find(p => p.id === voterId);
                    if (voter) {
                        if (voter.role.votingPower) {
                            voteCount += voter.role.votingPower;
                        } else {
                            voteCount += 1;
                        }
                    }
                });
                if (voteCount > maxVotes) {
                    maxVotes = voteCount;
                    eliminatedPlayer = gameState.players.find(p => p.id === parseInt(targetId));
                }
            });
        }
        
        if (eliminatedPlayer) {
            eliminatedPlayer.alive = false;
            alert(`${eliminatedPlayer.name} выбывает из игры (${maxVotes} голосов).`);
        } else {
            alert('Никто не выбывает из игры.');
        }
    } else {
        // Если нет голосов вообще
        alert('Голосов нет. Никто не выбывает.');
    }
    
    // Проверяем условия окончания игры
    const mafiaAlive = gameState.players.filter(p => p.alive && p.role.type === 'mafia').length;
    const peacefulAlive = gameState.players.filter(p => p.alive && p.role.type === 'peaceful').length;
    
    if (mafiaAlive === 0) {
        alert('Мирные жители победили!');
        return;
    }
    
    if (mafiaAlive >= peacefulAlive) {
        alert('Мафия победила!');
        return;
    }
    
    // Переход к следующей ночи
    if (confirm('Перейти к следующей ночи?')) {
        startNightPhase();
    }
}

// Добавляем обработчик для завершения ночи
document.getElementById('btn-end-night').addEventListener('click', () => {
    startVoting();
});

// Функция показа модального окна с правилами
function showHelpModal() {
    const modal = document.getElementById('help-modal');
    const content = document.getElementById('help-content');
    if (!modal || !content) return;
    
    let html = '<div class="help-section"><h3>Правила игры</h3>';
    html += '<p>Игра проходит в два этапа: ночь и день.</p>';
    html += '<p><strong>Ночь:</strong> Все роли просыпаются по очереди и выполняют свои действия.</p>';
    html += '<p><strong>День:</strong> Игроки обсуждают и голосуют за исключение подозреваемого.</p>';
    html += '<p>Цель мафии - уничтожить всех мирных жителей. Цель мирных - найти и исключить всех мафиози.</p>';
    html += '</div>';
    
    html += '<div class="help-section"><h3>Описание ролей</h3>';
    
    Object.entries(ROLES).forEach(([key, role]) => {
        if (key === 'peaceful') return; // Пропускаем базового мирного жителя
        const typeName = role.type === 'mafia' ? 'Мафия' : role.type === 'peaceful' ? 'Мирный' : 'Нейтральный';
        html += `<div class="role-help-item ${role.type}">`;
        html += `<strong>${role.name}</strong> (${typeName})`;
        html += `<p>${role.description}</p>`;
        if (role.votingPower) {
            html += `<p>Голос мэра считается как ${role.votingPower} голоса.</p>`;
        }
        if (role.specialWin) {
            html += `<p>Особое условие победы: выигрывает, если его выгнали голосованием.</p>`;
        }
        html += '</div>';
    });
    
    html += '</div>';
    content.innerHTML = html;
    modal.classList.add('active');
}

