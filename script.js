function decimalToFraction(val) {
    if (val === 0) return '0';
    if (val === 1) return '1';
    if (val === 2) return '2';
    if (val === 3) return '3';
    if (val === 4) return '4';
    if (val === 5) return '5';
    if (val === 6) return '6';
    const thirds = Math.round(val * 3);
    const whole = Math.floor(thirds / 3);
    const rem = thirds % 3;
    let str = '';
    if (whole > 0) str += whole;
    if (rem === 1) str += (whole > 0 ? ' ' : '') + '1/3';
    if (rem === 2) str += (whole > 0 ? ' ' : '') + '2/3';
    return str.trim();
}

function fractionToDecimal(str) {
    str = str.trim();
    if (str === '0') return 0;
    let total = 0;
    let parts = str.split(' ');
    for (let part of parts) {
        if (part.includes('/')) {
            let [num, den] = part.split('/').map(Number);
            total += num / den;
        } else {
            total += Number(part);
        }
    }
    return total;
}
// Player lists - separate for each mode
let usssaPlayers = [];
let usssaPlayerOrder = [];
let llPlayers = [];
let llPlayerOrder = [];

// Current mode player list references
let players = [];
let playerOrder = [];

let deleteMode = false;
let use13URules = false;
let useThreeDayColumn = false;
let useLittleLeague = false; // Little League mode flag
let activeDay = 'day1'; // Track which day column is currently active (USSSA)
let activeLLColumn = 'pitches'; // Track which column is active in Little League mode

// Tournament Rules Constants
const RULES_7U_12U = {
    ONE_DAY_MAX_TO_PITCH_NEXT: 3,
    ONE_DAY_MAX: 6,
    THREE_DAY_MAX: 8,
    NAME: '7U-12U'
};

const RULES_13U = {
    ONE_DAY_MAX_TO_PITCH_NEXT: 3,
    ONE_DAY_MAX: 7,
    THREE_DAY_MAX: 8,
    NAME: '13U+'
};

// Current active rules
let RULES = { ...RULES_7U_12U };

// Little League Pitch Count Rules
const LL_RULES = {
    AGE_7_8: { max: 50, rest: [[66, 4], [51, 3], [36, 2], [21, 1], [1, 0]] },
    AGE_9_10: { max: 75, rest: [[66, 4], [51, 3], [36, 2], [21, 1], [1, 0]] },
    AGE_11_12: { max: 85, rest: [[66, 4], [51, 3], [36, 2], [21, 1], [1, 0]] },
    AGE_13_14: { max: 95, rest: [[66, 4], [51, 3], [36, 2], [21, 1], [1, 0]] },
    AGE_15_16: { max: 95, rest: [[76, 4], [61, 3], [46, 2], [31, 1], [1, 0]] }
};

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Little League Catcher Rules
function canCatchAfterPitching(pitches) {
    if (pitches >= 41) return false; // Cannot catch after 41+ pitches
    return true;
}

function canPitchAfterCatching(caughtInnings) {
    // If caught 4+ innings, cannot pitch in the same calendar day
    return caughtInnings < 4;
}

// Initialize data storage
let pitchingData = {};

// Little League specific data structures
let playerAges = {}; // Store player ages for LL mode
let llPitchData = {}; // Store pitch counts per day for LL mode
let llDayOfWeek = {}; // Store day of week for each player
// Structure: { playerName: { day1: { pitches: 0 }, day2: { pitches: 0 }, day3: { pitches: 0 } } }

// Load saved data from localStorage
function loadData() {
    // Load USSSA players
    const savedUSSSAPlayers = localStorage.getItem('usssaPlayers');
    if (savedUSSSAPlayers) {
        usssaPlayers = JSON.parse(savedUSSSAPlayers);
    } else {
        // Check for legacy 'players' data and migrate it to USSSA
        const savedPlayers = localStorage.getItem('players');
        if (savedPlayers) {
            usssaPlayers = JSON.parse(savedPlayers);
        } else {
            usssaPlayers = [];
        }
    }
    
    // Load Little League players
    const savedLLPlayers = localStorage.getItem('llPlayers');
    if (savedLLPlayers) {
        llPlayers = JSON.parse(savedLLPlayers);
    } else {
        llPlayers = [];
    }
    
    // Load Little League mode setting first
    const savedLLMode = localStorage.getItem('useLittleLeague');
    if (savedLLMode !== null) {
        useLittleLeague = JSON.parse(savedLLMode);
    }
    
    // Set current mode references
    if (useLittleLeague) {
        players = llPlayers;
    } else {
        players = usssaPlayers;
    }
    
    const saved = localStorage.getItem('pitchingData');
    if (saved) {
        pitchingData = JSON.parse(saved);
        // Ensure all players have day3 property
        players.forEach(player => {
            if (!pitchingData[player]) {
                pitchingData[player] = { day1: 0, day2: 0, day3: 0 };
            }
            if (pitchingData[player].day3 === undefined) {
                pitchingData[player].day3 = 0;
            }
        });
    } else {
        // Initialize with default values
        players.forEach(player => {
            pitchingData[player] = {
                day1: 0,
                day2: 0,
                day3: 0
            };
        });
    }
    
    // Load USSSA player order
    const savedUSSSAOrder = localStorage.getItem('usssaPlayerOrder');
    if (savedUSSSAOrder) {
        usssaPlayerOrder = JSON.parse(savedUSSSAOrder);
        // Ensure all players are in the order array
        usssaPlayers.forEach(player => {
            if (!usssaPlayerOrder.includes(player)) {
                usssaPlayerOrder.push(player);
            }
        });
        // Remove any players from order that no longer exist
        usssaPlayerOrder = usssaPlayerOrder.filter(player => usssaPlayers.includes(player));
    } else {
        // Check for legacy 'playerOrder' and migrate
        const savedOrder = localStorage.getItem('playerOrder');
        if (savedOrder) {
            usssaPlayerOrder = JSON.parse(savedOrder);
        } else {
            usssaPlayerOrder = [...usssaPlayers];
        }
    }
    
    // Load Little League player order
    const savedLLOrder = localStorage.getItem('llPlayerOrder');
    if (savedLLOrder) {
        llPlayerOrder = JSON.parse(savedLLOrder);
        // Ensure all players are in the order array
        llPlayers.forEach(player => {
            if (!llPlayerOrder.includes(player)) {
                llPlayerOrder.push(player);
            }
        });
        // Remove any players from order that no longer exist
        llPlayerOrder = llPlayerOrder.filter(player => llPlayers.includes(player));
    } else {
        llPlayerOrder = [...llPlayers];
    }
    
    // Set current mode references
    if (useLittleLeague) {
        playerOrder = llPlayerOrder;
    } else {
        playerOrder = usssaPlayerOrder;
    }
    
    // Load 13U rules setting
    const saved13U = localStorage.getItem('use13URules');
    if (saved13U !== null) {
        use13URules = JSON.parse(saved13U);
        updateRules();
    }
    
    // Load Three Day column setting
    const savedThreeDay = localStorage.getItem('useThreeDayColumn');
    if (savedThreeDay !== null) {
        useThreeDayColumn = JSON.parse(savedThreeDay);
    }
    
    // Load active day setting
    const savedActiveDay = localStorage.getItem('activeDay');
    if (savedActiveDay !== null) {
        activeDay = savedActiveDay;
    }
    
    // Load active LL column setting
    const savedActiveLLColumn = localStorage.getItem('activeLLColumn');
    if (savedActiveLLColumn !== null) {
        activeLLColumn = savedActiveLLColumn;
    }
    
    // Load Little League data
    const savedAges = localStorage.getItem('playerAges');
    if (savedAges) {
        playerAges = JSON.parse(savedAges);
    }
    
    const savedLLData = localStorage.getItem('llPitchData');
    if (savedLLData) {
        llPitchData = JSON.parse(savedLLData);
    }
    
    const savedLLDayOfWeek = localStorage.getItem('llDayOfWeek');
    if (savedLLDayOfWeek) {
        llDayOfWeek = JSON.parse(savedLLDayOfWeek);
    }
}

// Save data to localStorage
function saveData() {
    localStorage.setItem('usssaPlayers', JSON.stringify(usssaPlayers));
    localStorage.setItem('usssaPlayerOrder', JSON.stringify(usssaPlayerOrder));
    localStorage.setItem('llPlayers', JSON.stringify(llPlayers));
    localStorage.setItem('llPlayerOrder', JSON.stringify(llPlayerOrder));
    localStorage.setItem('pitchingData', JSON.stringify(pitchingData));
    localStorage.setItem('use13URules', JSON.stringify(use13URules));
    localStorage.setItem('useThreeDayColumn', JSON.stringify(useThreeDayColumn));
    localStorage.setItem('activeDay', activeDay);
    localStorage.setItem('activeLLColumn', activeLLColumn);
    localStorage.setItem('useLittleLeague', JSON.stringify(useLittleLeague));
    localStorage.setItem('playerAges', JSON.stringify(playerAges));
    localStorage.setItem('llPitchData', JSON.stringify(llPitchData));
    localStorage.setItem('llDayOfWeek', JSON.stringify(llDayOfWeek));
    localStorage.setItem('llDayOfWeek', JSON.stringify(llDayOfWeek));
}

// Calculate remaining innings and status
function calculateStatus(player) {
    const data = pitchingData[player];
    const day1 = parseFloat(data.day1) || 0;
    const day2 = parseFloat(data.day2) || 0;
    const day3 = parseFloat(data.day3) || 0;
    const total = day1 + day2 + day3;
    const day1And2Total = day1 + day2;

    // Calculate remaining innings for each day
    // Day 1: Can pitch up to 6 innings
    const day1Remaining = Math.max(0, RULES.ONE_DAY_MAX - day1);
    
    // Day 2: If Day 1 exceeded 3 innings, must rest
    let day2Remaining;
    if (day1 > RULES.ONE_DAY_MAX_TO_PITCH_NEXT) {
        day2Remaining = 0;
    } else {
        // Limited by 6 per day AND by 8 total over 2 days
        day2Remaining = Math.max(0, Math.min(
            RULES.ONE_DAY_MAX - day2,
            RULES.THREE_DAY_MAX - day1And2Total
        ));
    }
    
    // Day 3: If Day 2 exceeded 3 innings, must rest
    let day3Remaining;
    if (day2 > RULES.ONE_DAY_MAX_TO_PITCH_NEXT) {
        day3Remaining = 0;
    } else {
        // Limited by 6 per day AND by 8 total over 3 days
        day3Remaining = Math.max(0, Math.min(
            RULES.ONE_DAY_MAX - day3,
            RULES.THREE_DAY_MAX - total
        ));
    }

    // Determine status
    let status = 'OK';
    let statusClass = 'status-ok';
    let message = 'Available';

    // Check if player must rest on Day 2
    if (day1 > RULES.ONE_DAY_MAX_TO_PITCH_NEXT) {
        status = 'MUST REST DAY 2';
        statusClass = 'status-rest';
        message = 'Must rest Day 2 (pitched >3 innings Day 1)';
    }
    // Check if day1+day2 reached 8 innings
    else if (day1And2Total >= RULES.THREE_DAY_MAX) {
        status = 'MUST REST DAY 3';
        statusClass = 'status-rest';
        message = '8 innings in 2 days - must rest Day 3';
    }
    // Check if approaching or exceeding three-day maximum
    else if (total >= RULES.THREE_DAY_MAX) {
        status = 'MAX REACHED';
        statusClass = 'status-danger';
        message = '8 inning maximum reached';
    }
    // Check if exceeding one-day maximum
    else if (day1 > RULES.ONE_DAY_MAX || day2 > RULES.ONE_DAY_MAX || day3 > RULES.ONE_DAY_MAX) {
        status = 'EXCEEDED';
        statusClass = 'status-danger';
        message = 'Exceeded 6 inning daily maximum!';
    }
    // Warning if close to limits
    else if (day1 >= RULES.ONE_DAY_MAX_TO_PITCH_NEXT || day2 >= RULES.ONE_DAY_MAX_TO_PITCH_NEXT || day3 >= RULES.ONE_DAY_MAX_TO_PITCH_NEXT || total >= 6) {
        status = 'WARNING';
        statusClass = 'status-warning';
        if (day1 >= RULES.ONE_DAY_MAX_TO_PITCH_NEXT || day2 >= RULES.ONE_DAY_MAX_TO_PITCH_NEXT || day3 >= RULES.ONE_DAY_MAX_TO_PITCH_NEXT) {
            message = 'At limit to pitch next day';
        } else {
            message = 'Approaching limits';
        }
    }

    return {
        day1Remaining: day1Remaining.toFixed(1),
        day2Remaining: day2Remaining.toFixed(1),
        day3Remaining: day3Remaining.toFixed(1),
        status: status,
        statusClass: statusClass,
        message: message
    };
}

// Calculate max allowed innings for a specific day
function getMaxAllowed(player, day) {
    const data = pitchingData[player];
    const day1 = parseFloat(data.day1) || 0;
    const day2 = parseFloat(data.day2) || 0;
    const day3 = parseFloat(data.day3) || 0;
    
    if (day === 'day1') {
        return RULES.ONE_DAY_MAX;
    } else if (day === 'day2') {
        // If Day 1 exceeded 3 innings, must rest Day 2
        if (day1 > RULES.ONE_DAY_MAX_TO_PITCH_NEXT) {
            return 0;
        }
        // Day 2 is limited by 6 per day AND 8 total over 2 days
        return Math.min(RULES.ONE_DAY_MAX, RULES.THREE_DAY_MAX - day1);
    } else if (day === 'day3') {
        // If Day 2 exceeded 3 innings, must rest Day 3
        if (day2 > RULES.ONE_DAY_MAX_TO_PITCH_NEXT) {
            return 0;
        }
        // Day 3 is limited by 6 per day AND 8 total over 3 days
        return Math.min(RULES.ONE_DAY_MAX, RULES.THREE_DAY_MAX - day1 - day2);
    }
    return RULES.ONE_DAY_MAX;
}

// Increment innings
function incrementInnings(player, day) {
    const currentValue = parseFloat(pitchingData[player][day]) || 0;
    const maxAllowed = getMaxAllowed(player, day);
    const step = 1/3;
    let newValue = currentValue + step;
    
    // Round to nearest third and clamp
    newValue = Math.round(newValue * 3) / 3;
    newValue = Math.min(maxAllowed, newValue);
    
    pitchingData[player][day] = newValue;
    
    // If Day 1 exceeds 3 innings, clear Day 2 and Day 3 (must rest)
    if (day === 'day1' && newValue > RULES.ONE_DAY_MAX_TO_PITCH_NEXT) {
        pitchingData[player]['day2'] = 0;
        pitchingData[player]['day3'] = 0;
    }
    
    // If Day 2 exceeds 3 innings, clear Day 3 (must rest)
    if (day === 'day2' && newValue > RULES.ONE_DAY_MAX_TO_PITCH_NEXT) {
        pitchingData[player]['day3'] = 0;
    }
    
    saveData();
    renderTable();
}

// Decrement innings
function decrementInnings(player, day) {
    const currentValue = parseFloat(pitchingData[player][day]) || 0;
    const step = 1/3;
    let newValue = currentValue - step;
    
    // Round to nearest third and clamp to minimum 0
    newValue = Math.round(newValue * 3) / 3;
    newValue = Math.max(0, newValue);
    
    pitchingData[player][day] = newValue;
    
    // If Day 1 exceeds 3 innings, clear Day 2 and Day 3 (must rest)
    if (day === 'day1' && newValue > RULES.ONE_DAY_MAX_TO_PITCH_NEXT) {
        pitchingData[player]['day2'] = 0;
        pitchingData[player]['day3'] = 0;
    }
    
    // If Day 2 exceeds 3 innings, clear Day 3 (must rest)
    if (day === 'day2' && newValue > RULES.ONE_DAY_MAX_TO_PITCH_NEXT) {
        pitchingData[player]['day3'] = 0;
    }
    
    saveData();
    renderTable();
}

// Calculate total tournament innings remaining (for Left column display)
// Shows tournament total remaining, but caps by daily max only on the last day
function getInningsLeftForDay(player, day) {
    const data = pitchingData[player];
    const day1 = parseFloat(data.day1) || 0;
    const day2 = parseFloat(data.day2) || 0;
    const day3 = parseFloat(data.day3) || 0;
    const totalInnings = day1 + day2 + day3;
    
    // Base tournament remaining
    const tournamentRemaining = Math.max(0, RULES.THREE_DAY_MAX - totalInnings);
    
    // Check rest requirements for active day
    if (day === 'day2' && day1 > RULES.ONE_DAY_MAX_TO_PITCH_NEXT) {
        return 0; // Must rest Day 2
    }
    if (day === 'day3' && day2 > RULES.ONE_DAY_MAX_TO_PITCH_NEXT) {
        return 0; // Must rest Day 3
    }
    
    // Determine if active day is the last day of the tournament
    const isLastDay = (day === 'day2' && !useThreeDayColumn) || (day === 'day3' && useThreeDayColumn);
    
    if (isLastDay) {
        // Cap by daily max since it's the last day
        const inningsPitchedToday = day === 'day2' ? day2 : day3;
        const dailyRemaining = Math.max(0, RULES.ONE_DAY_MAX - inningsPitchedToday);
        return Math.min(tournamentRemaining, dailyRemaining);
    }
    
    // Not the last day, show full tournament remaining
    return tournamentRemaining;
}

// Set active day and re-render
function setActiveDay(day) {
    activeDay = day;
    localStorage.setItem('activeDay', activeDay);
    renderTable();
}

// Set active Little League column and re-render
function setActiveLLColumn(column) {
    activeLLColumn = column;
    saveData();
    renderTable();
}

// ============ LITTLE LEAGUE FUNCTIONS ============

// Get LL rules for a specific age
function getLLRules(age) {
    if (age <= 8) return LL_RULES.AGE_7_8;
    if (age <= 10) return LL_RULES.AGE_9_10;
    if (age <= 12) return LL_RULES.AGE_11_12;
    if (age <= 14) return LL_RULES.AGE_13_14;
    return LL_RULES.AGE_15_16;
}

// Calculate rest days required based on pitch count and age
function getRestDaysRequired(pitches, age) {
    const rules = getLLRules(age);
    for (let [threshold, days] of rules.rest) {
        if (pitches >= threshold) return days;
    }
    return 0;
}

// Change player age
function changePlayerAge(player, direction) {
    if (!playerAges[player]) playerAges[player] = 12;
    playerAges[player] += direction;
    if (playerAges[player] < 7) playerAges[player] = 7;
    if (playerAges[player] > 16) playerAges[player] = 16;
    saveData();
    renderTable();
}

// Change day of week
function changeLLDayOfWeek(player, direction) {
    if (!llDayOfWeek[player]) llDayOfWeek[player] = '';
    
    const currentIndex = DAYS_OF_WEEK.indexOf(llDayOfWeek[player]);
    let newIndex;
    
    if (currentIndex === -1) {
        // Not set yet, start with Monday
        newIndex = 0;
    } else {
        newIndex = currentIndex + direction;
        if (newIndex < 0) newIndex = DAYS_OF_WEEK.length - 1;
        if (newIndex >= DAYS_OF_WEEK.length) newIndex = 0;
    }
    
    llDayOfWeek[player] = DAYS_OF_WEEK[newIndex];
    saveData();
    renderTable();
}

// Calculate next available day to pitch
function calculateNextAvailable(player) {
    const dayOfWeek = llDayOfWeek[player] || '';
    const age = playerAges[player] || 12;
    const pitches = llPitchData[player]?.pitches || 0;
    
    if (!dayOfWeek || pitches === 0) return 'Available';
    
    const restDays = getRestDaysRequired(pitches, age);
    if (restDays === 0) return 'Available';
    
    const dayIndex = DAYS_OF_WEEK.indexOf(dayOfWeek);
    if (dayIndex === -1) return 'Available';
    
    const nextDayIndex = (dayIndex + restDays + 1) % 7;
    return DAYS_OF_WEEK[nextDayIndex];
}

// Increment pitch count for LL mode
function incrementLLPitches(player) {
    if (!llPitchData[player]) {
        llPitchData[player] = { pitches: 0 };
    }
    
    const age = playerAges[player] || 12;
    const rules = getLLRules(age);
    const currentPitches = llPitchData[player].pitches || 0;
    
    if (currentPitches < rules.max) {
        llPitchData[player].pitches = Math.min(currentPitches + 1, rules.max);
        saveData();
        renderTable();
    }
}

// Decrement pitch count for LL mode
function decrementLLPitches(player) {
    if (!llPitchData[player]) return;
    
    const currentPitches = llPitchData[player].pitches || 0;
    if (currentPitches > 0) {
        llPitchData[player].pitches = currentPitches - 1;
        saveData();
        renderTable();
    }
}

// No need for column header updates in simplified LL mode

// Update column headers to show which is active (for Little League mode)
function updateLLColumnHeaders() {
    const ageHeader = document.querySelector('th:nth-child(3)');
    const dayOfWeekHeader = document.querySelector('th:nth-child(4)');
    const pitchesHeader = document.querySelector('th:nth-child(5)');
    
    if (ageHeader) {
        ageHeader.className = activeLLColumn === 'age' ? 'active-header' : '';
        ageHeader.style.cursor = 'pointer';
    }
    if (dayOfWeekHeader) {
        dayOfWeekHeader.className = activeLLColumn === 'dayOfWeek' ? 'active-header' : '';
        dayOfWeekHeader.style.cursor = 'pointer';
    }
    if (pitchesHeader) {
        pitchesHeader.className = activeLLColumn === 'pitches' ? 'active-header' : '';
        pitchesHeader.style.cursor = 'pointer';
    }
}

// Update column headers to show which is active (for USSSA mode)
function updateColumnHeaders() {
    const day1Header = document.querySelector('th:nth-child(3)');
    const day2Header = document.querySelector('th:nth-child(4)');
    const day3Header = document.querySelector('th:nth-child(5)');
    
    if (day1Header) {
        day1Header.className = activeDay === 'day1' ? 'active-header' : '';
        day1Header.style.cursor = 'pointer';
    }
    if (day2Header) {
        day2Header.className = activeDay === 'day2' ? 'active-header' : '';
        day2Header.style.cursor = 'pointer';
    }
    if (day3Header) {
        day3Header.className = activeDay === 'day3' ? 'active-header' : '';
        day3Header.style.cursor = 'pointer';
    }
}

// Render Little League table
function renderLittleLeagueTable() {
    const tbody = document.getElementById('pitchingTableBody');
    const table = document.getElementById('pitchingTable');
    tbody.innerHTML = '';
    
    // Update table header for LL mode
    const thead = table.querySelector('thead tr');
    thead.innerHTML = `
        <th></th>
        <th>Player</th>
        <th onclick="setActiveLLColumn('age')" style="cursor: pointer;">Age</th>
        <th onclick="setActiveLLColumn('dayOfWeek')" style="cursor: pointer;">Day of Week</th>
        <th onclick="setActiveLLColumn('pitches')" style="cursor: pointer;">Pitches</th>
        <th>Next Available</th>
    `;
    
    // Update column headers to show which is active
    updateLLColumnHeaders();
    
    // Show/hide the Remove Player button
    const deleteBtn = document.getElementById('deleteBtn');
    if (playerOrder.length === 0) {
        deleteBtn.style.display = 'none';
    } else {
        deleteBtn.style.display = '';
    }
    
    if (playerOrder.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="6" style="text-align: center; padding: 2rem; color: #666;">
                No players added yet. Click "Add Player" to get started.
            </td>
        `;
        tbody.appendChild(row);
        return;
    }
    
    playerOrder.forEach((player, index) => {
        const age = playerAges[player] || 12;
        const pitches = llPitchData[player]?.pitches || 0;
        
        const dayOfWeek = llDayOfWeek[player] || '';
        const nextAvailable = calculateNextAvailable(player);
        
        const rules = getLLRules(age);
        
        // Build cells - only show arrows for active column
        let ageCell, dayOfWeekCell, pitchesCell;
        
        if (activeLLColumn === 'age') {
            ageCell = `
                <td class="active-day" onclick="setActiveLLColumn('age')" style="cursor: pointer;">
                    <div class="innings-counter">
                        <button class="counter-btn counter-btn-up" onclick="event.stopPropagation(); changePlayerAge('${player}', 1)" ${age >= 16 ? 'disabled' : ''}>▲</button>
                        <span class="innings-value">${age}</span>
                        <button class="counter-btn counter-btn-down" onclick="event.stopPropagation(); changePlayerAge('${player}', -1)" ${age <= 7 ? 'disabled' : ''}>▼</button>
                    </div>
                </td>`;
            dayOfWeekCell = `<td onclick="setActiveLLColumn('dayOfWeek')" style="cursor: pointer;"><span class="innings-value">${dayOfWeek || '--'}</span></td>`;
            pitchesCell = `<td onclick="setActiveLLColumn('pitches')" style="cursor: pointer;"><span class="innings-value">${pitches}</span></td>`;
        } else if (activeLLColumn === 'dayOfWeek') {
            ageCell = `<td onclick="setActiveLLColumn('age')" style="cursor: pointer;"><span class="innings-value">${age}</span></td>`;
            dayOfWeekCell = `
                <td class="active-day" onclick="setActiveLLColumn('dayOfWeek')" style="cursor: pointer;">
                    <div class="innings-counter">
                        <button class="counter-btn counter-btn-up" onclick="event.stopPropagation(); changeLLDayOfWeek('${player}', 1)">▲</button>
                        <span class="innings-value">${dayOfWeek || '--'}</span>
                        <button class="counter-btn counter-btn-down" onclick="event.stopPropagation(); changeLLDayOfWeek('${player}', -1)">▼</button>
                    </div>
                </td>`;
            pitchesCell = `<td onclick="setActiveLLColumn('pitches')" style="cursor: pointer;"><span class="innings-value">${pitches}</span></td>`;
        } else { // pitches
            ageCell = `<td onclick="setActiveLLColumn('age')" style="cursor: pointer;"><span class="innings-value">${age}</span></td>`;
            dayOfWeekCell = `<td onclick="setActiveLLColumn('dayOfWeek')" style="cursor: pointer;"><span class="innings-value">${dayOfWeek || '--'}</span></td>`;
            pitchesCell = `
                <td class="active-day" onclick="setActiveLLColumn('pitches')" style="cursor: pointer;">
                    <div class="innings-counter">
                        <button class="counter-btn counter-btn-up" onclick="event.stopPropagation(); incrementLLPitches('${player}')" ${pitches >= rules.max ? 'disabled' : ''}>▲</button>
                        <span class="innings-value">${pitches}</span>
                        <button class="counter-btn counter-btn-down" onclick="event.stopPropagation(); decrementLLPitches('${player}')" ${pitches <= 0 ? 'disabled' : ''}>▼</button>
                    </div>
                </td>`;
        }
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="drag-handle ${deleteMode ? 'delete-mode' : ''}" ${deleteMode ? `onclick="removePlayer('${player}')"` : ''}>${deleteMode ? '✕' : '☰'}</td>
            <td>
                <div class="player-name-cell">
                    <span class="player-name" ondblclick="editPlayerName('${player}')">${player}</span>
                </div>
            </td>
            ${ageCell}
            ${dayOfWeekCell}
            ${pitchesCell}
            <td style="text-align: center; font-weight: bold;">${nextAvailable}</td>
        `;
        
        row.setAttribute('data-player', player);
        row.setAttribute('data-index', index);
        row.setAttribute('draggable', 'false');
        
        const dragHandle = row.querySelector('.drag-handle');
        
        // Add long-press support to player name for editing
        const playerNameSpan = row.querySelector('.player-name');
        let longPressTimer = null;
        
        playerNameSpan.addEventListener('touchstart', (e) => {
            longPressTimer = setTimeout(() => {
                editPlayerName(player);
            }, 500);
        }, { passive: true });
        
        playerNameSpan.addEventListener('touchend', () => {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        }, { passive: true });
        
        playerNameSpan.addEventListener('touchmove', () => {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        }, { passive: true });
        
        // Only enable dragging if not in delete mode
        if (!deleteMode) {
            dragHandle.setAttribute('draggable', 'true');
            dragHandle.addEventListener('dragstart', handleDragStart);
            row.addEventListener('dragover', handleDragOver);
            row.addEventListener('drop', handleDrop);
            row.addEventListener('dragenter', handleDragEnter);
            row.addEventListener('dragleave', handleDragLeave);
            
            // Add touch event listeners for mobile
            dragHandle.addEventListener('touchstart', handleTouchStart, { passive: false });
            row.addEventListener('touchmove', handleTouchMove, { passive: false });
            row.addEventListener('touchend', handleTouchEnd, { passive: false });
            row.addEventListener('touchcancel', handleTouchEnd, { passive: false });
        } else {
            dragHandle.setAttribute('draggable', 'false');
        }
        
        tbody.appendChild(row);
    });
}

// Create table rows
function renderTable() {
    // Branch to Little League rendering if in LL mode
    if (useLittleLeague) {
        renderLittleLeagueTable();
        return;
    }
    
    // Original USSSA rendering code - restore USSSA header
    const table = document.getElementById('pitchingTable');
    const thead = table.querySelector('thead tr');
    thead.innerHTML = `
        <th></th>
        <th>Player</th>
        <th onclick="setActiveDay('day1')" style="cursor: pointer;">Day 1</th>
        <th onclick="setActiveDay('day2')" style="cursor: pointer;">Day 2</th>
        <th onclick="setActiveDay('day3')" style="cursor: pointer;">Day 3</th>
        <th>Left</th>
    `;
    
    const tbody = document.getElementById('pitchingTableBody');
    tbody.innerHTML = '';
    
    // Toggle Day 3 column visibility
    if (useThreeDayColumn) {
        table.classList.remove('hide-day3');
    } else {
        table.classList.add('hide-day3');
    }
    
    // Update column headers to show which day is active
    updateColumnHeaders();
    
    // Show/hide the Remove Player button based on player count
    const deleteBtn = document.getElementById('deleteBtn');
    if (playerOrder.length === 0) {
        deleteBtn.style.display = 'none';
    } else {
        deleteBtn.style.display = '';
    }
    
    if (playerOrder.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="${useThreeDayColumn ? '6' : '5'}" style="text-align: center; padding: 2rem; color: #666;">
                No players added yet. Click "Add Player" to get started.
            </td>
        `;
        tbody.appendChild(row);
        return;
    }

    playerOrder.forEach((player, index) => {
        const data = pitchingData[player];
        const row = document.createElement('tr');
        
        const day1 = parseFloat(data.day1) || 0;
        const day2 = parseFloat(data.day2) || 0;
        const day3 = parseFloat(data.day3) || 0;
        
        // Calculate innings left for the ACTIVE day
        const inningsLeftForActiveDay = getInningsLeftForDay(player, activeDay);
        const remainingClass = inningsLeftForActiveDay <= 0 ? 'none' : (inningsLeftForActiveDay <= 2 ? 'low' : '');
        
        // Determine row status class based on active day's availability
        let rowStatusClass = '';
        if (inningsLeftForActiveDay <= 0) {
            rowStatusClass = 'row-danger';
        } else if (inningsLeftForActiveDay <= 2) {
            rowStatusClass = 'row-warning';
        } else {
            rowStatusClass = 'row-ok';
        }
        row.className = rowStatusClass;
        
        const day1Max = getMaxAllowed(player, 'day1');
        const day2Max = getMaxAllowed(player, 'day2');
        const day3Max = getMaxAllowed(player, 'day3');
        
        // Build day cells - only show arrows for active day
        let day1Cell, day2Cell, day3Cell;
        
        if (activeDay === 'day1') {
            day1Cell = `
                <td class="active-day">
                    <div class="innings-counter">
                        <button class="counter-btn counter-btn-up" onclick="incrementInnings('${player}', 'day1')" ${day1 >= day1Max ? 'disabled' : ''}>▲</button>
                        <span class="innings-value">${decimalToFraction(day1)}</span>
                        <button class="counter-btn counter-btn-down" onclick="decrementInnings('${player}', 'day1')" ${day1 <= 0 ? 'disabled' : ''}>▼</button>
                    </div>
                </td>`;
            day2Cell = `<td onclick="setActiveDay('day2')" style="cursor: pointer;"><span class="innings-value">${decimalToFraction(day2)}</span></td>`;
            day3Cell = `<td onclick="setActiveDay('day3')" style="cursor: pointer;"><span class="innings-value">${decimalToFraction(day3)}</span></td>`;
        } else if (activeDay === 'day2') {
            day1Cell = `<td onclick="setActiveDay('day1')" style="cursor: pointer;"><span class="innings-value">${decimalToFraction(day1)}</span></td>`;
            day2Cell = `
                <td class="active-day">
                    <div class="innings-counter">
                        <button class="counter-btn counter-btn-up" onclick="incrementInnings('${player}', 'day2')" ${day2 >= day2Max ? 'disabled' : ''}>▲</button>
                        <span class="innings-value">${decimalToFraction(day2)}</span>
                        <button class="counter-btn counter-btn-down" onclick="decrementInnings('${player}', 'day2')" ${day2 <= 0 ? 'disabled' : ''}>▼</button>
                    </div>
                </td>`;
            day3Cell = `<td onclick="setActiveDay('day3')" style="cursor: pointer;"><span class="innings-value">${decimalToFraction(day3)}</span></td>`;
        } else { // day3
            day1Cell = `<td onclick="setActiveDay('day1')" style="cursor: pointer;"><span class="innings-value">${decimalToFraction(day1)}</span></td>`;
            day2Cell = `<td onclick="setActiveDay('day2')" style="cursor: pointer;"><span class="innings-value">${decimalToFraction(day2)}</span></td>`;
            day3Cell = `
                <td class="active-day">
                    <div class="innings-counter">
                        <button class="counter-btn counter-btn-up" onclick="incrementInnings('${player}', 'day3')" ${day3 >= day3Max ? 'disabled' : ''}>▲</button>
                        <span class="innings-value">${decimalToFraction(day3)}</span>
                        <button class="counter-btn counter-btn-down" onclick="decrementInnings('${player}', 'day3')" ${day3 <= 0 ? 'disabled' : ''}>▼</button>
                    </div>
                </td>`;
        }
        
        row.innerHTML = `
            <td class="drag-handle ${deleteMode ? 'delete-mode' : ''}" ${deleteMode ? `onclick="removePlayer('${player}')"` : ''}>${deleteMode ? '✕' : '☰'}</td>
            <td>
                <div class="player-name-cell">
                    <span class="player-name" ondblclick="editPlayerName('${player}')">${player}</span>
                </div>
            </td>
            ${day1Cell}
            ${day2Cell}
            ${day3Cell}
            <td><span class="remaining total-innings ${remainingClass}">${decimalToFraction(inningsLeftForActiveDay)}</span></td>
        `;
        
        // Add drag and drop event listeners
        row.setAttribute('data-player', player);
        row.setAttribute('data-index', index);
        row.setAttribute('draggable', 'false'); // Disable draggable on the row itself
        
        // Query for the drag handle after innerHTML is set
        const dragHandle = row.querySelector('.drag-handle');
        
        // Add long-press support to player name for editing
        const playerNameSpan = row.querySelector('.player-name');
        let longPressTimer = null;
        
        playerNameSpan.addEventListener('touchstart', (e) => {
            longPressTimer = setTimeout(() => {
                editPlayerName(player);
            }, 500); // 500ms long press
        }, { passive: true });
        
        playerNameSpan.addEventListener('touchend', () => {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        }, { passive: true });
        
        playerNameSpan.addEventListener('touchmove', () => {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        }, { passive: true });
        
        // Only enable dragging if not in delete mode
        if (!deleteMode) {
            dragHandle.setAttribute('draggable', 'true');
            dragHandle.addEventListener('dragstart', handleDragStart);
            row.addEventListener('dragover', handleDragOver);
            row.addEventListener('drop', handleDrop);
            row.addEventListener('dragenter', handleDragEnter);
            row.addEventListener('dragleave', handleDragLeave);
            
            // Add touch event listeners for mobile
            dragHandle.addEventListener('touchstart', handleTouchStart, { passive: false });
            row.addEventListener('touchmove', handleTouchMove, { passive: false });
            row.addEventListener('touchend', handleTouchEnd, { passive: false });
            row.addEventListener('touchcancel', handleTouchEnd, { passive: false });
        } else {
            dragHandle.setAttribute('draggable', 'false');
        }
        
        tbody.appendChild(row);
    });
}

let draggedElement = null;
let touchStartY = 0;
let touchCurrentY = 0;
let placeholder = null;
let isDragging = false;

function handleDragStart(e) {
    draggedElement = e.target.closest('tr');
    draggedElement.style.opacity = '0.5';
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', draggedElement.innerHTML);
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDragEnter(e) {
    const row = e.target.closest('tr');
    if (row && row !== draggedElement) {
        row.style.borderTop = '3px solid #0066cc';
    }
}

function handleDragLeave(e) {
    const row = e.target.closest('tr');
    if (row) {
        row.style.borderTop = '';
    }
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    
    const targetRow = e.target.closest('tr');
    if (draggedElement && targetRow && draggedElement !== targetRow) {
        const draggedIndex = parseInt(draggedElement.getAttribute('data-index'));
        const targetIndex = parseInt(targetRow.getAttribute('data-index'));
        
        // Reorder the playerOrder array
        const draggedPlayer = playerOrder[draggedIndex];
        playerOrder.splice(draggedIndex, 1);
        playerOrder.splice(targetIndex, 0, draggedPlayer);
        
        // Update the mode-specific array
        if (useLittleLeague) {
            llPlayerOrder = [...playerOrder];
        } else {
            usssaPlayerOrder = [...playerOrder];
        }
        
        saveData();
        renderTable();
    }
    
    if (draggedElement) {
        draggedElement.style.opacity = '1';
    }
    if (targetRow) {
        targetRow.style.borderTop = '';
    }
    
    return false;
}

// Touch event handlers for mobile
function handleTouchStart(e) {
    // Only start drag from the drag handle
    if (!e.target.classList.contains('drag-handle')) return;
    
    draggedElement = e.target.closest('tr');
    if (!draggedElement) return;
    
    isDragging = false; // Will set to true on first move
    touchStartY = e.touches[0].clientY;
    
    e.preventDefault();
    e.stopPropagation();
}

function handleTouchMove(e) {
    if (!draggedElement) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Start visual drag on first move
    if (!isDragging) {
        isDragging = true;
        draggedElement.style.opacity = '0.5';
        draggedElement.style.position = 'relative';
        draggedElement.style.zIndex = '1000';
        draggedElement.style.backgroundColor = '#e3f2fd';
    }
    
    touchCurrentY = e.touches[0].clientY;
    const deltaY = touchCurrentY - touchStartY;
    
    draggedElement.style.transform = `translateY(${deltaY}px)`;
    
    // Find the row we're hovering over
    const touch = e.touches[0];
    // Temporarily hide the dragged element to find what's below
    draggedElement.style.pointerEvents = 'none';
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    draggedElement.style.pointerEvents = '';
    
    const rowBelow = elementBelow ? elementBelow.closest('tr') : null;
    
    // Clear previous highlights
    document.querySelectorAll('tbody tr').forEach(row => {
        if (row !== draggedElement) {
            row.style.borderTop = '';
            row.style.borderBottom = '';
        }
    });
    
    // Highlight the target row
    if (rowBelow && rowBelow !== draggedElement && rowBelow.parentElement.tagName === 'TBODY') {
        const rect = rowBelow.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        
        if (touch.clientY < midpoint) {
            rowBelow.style.borderTop = '3px solid #0066cc';
        } else {
            rowBelow.style.borderBottom = '3px solid #0066cc';
        }
    }
}

function handleTouchEnd(e) {
    if (!draggedElement) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Only process if we actually dragged
    if (!isDragging) {
        draggedElement = null;
        return;
    }
    
    const touch = e.changedTouches[0];
    // Temporarily hide the dragged element to find what's below
    draggedElement.style.pointerEvents = 'none';
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    draggedElement.style.pointerEvents = '';
    
    const targetRow = elementBelow ? elementBelow.closest('tr') : null;
    
    if (targetRow && targetRow !== draggedElement && targetRow.parentElement.tagName === 'TBODY') {
        const draggedIndex = parseInt(draggedElement.getAttribute('data-index'));
        const targetIndex = parseInt(targetRow.getAttribute('data-index'));
        
        // Remove dragged player from array
        const draggedPlayer = playerOrder[draggedIndex];
        playerOrder.splice(draggedIndex, 1);
        
        // Calculate where target row is after removal
        const targetNewIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
        
        // Determine insertion point based on blue line position
        const rect = targetRow.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        
        let insertIndex;
        if (touch.clientY < midpoint) {
            // Blue line on TOP: insert before target
            insertIndex = targetNewIndex;
        } else {
            // Blue line on BOTTOM: insert after target
            insertIndex = targetNewIndex + 1;
        }
        
        playerOrder.splice(insertIndex, 0, draggedPlayer);
        
        // Update the mode-specific array
        if (useLittleLeague) {
            llPlayerOrder = [...playerOrder];
        } else {
            usssaPlayerOrder = [...playerOrder];
        }
        
        saveData();
    }
    
    // Reset styles and re-render
    if (draggedElement) {
        draggedElement.style.opacity = '';
        draggedElement.style.position = '';
        draggedElement.style.transform = '';
        draggedElement.style.zIndex = '';
        draggedElement.style.backgroundColor = '';
    }
    
    document.querySelectorAll('tbody tr').forEach(row => {
        row.style.borderTop = '';
        row.style.borderBottom = '';
    });
    
    draggedElement = null;
    isDragging = false;
    renderTable();
}

// Toggle delete mode
function toggleDeleteMode() {
    deleteMode = !deleteMode;
    const deleteBtn = document.getElementById('deleteBtn');
    
    if (deleteMode) {
        deleteBtn.textContent = 'Done';
        deleteBtn.classList.add('active');
    } else {
        deleteBtn.textContent = 'Remove Player';
        deleteBtn.classList.remove('active');
    }
    
    renderTable();
}

// Remove a player
function removePlayer(playerName) {
    if (!confirm(`Are you sure you want to remove ${playerName}?`)) {
        return;
    }
    
    // Remove from current mode's player list
    if (useLittleLeague) {
        const index = llPlayers.indexOf(playerName);
        if (index > -1) {
            llPlayers.splice(index, 1);
        }
        const orderIndex = llPlayerOrder.indexOf(playerName);
        if (orderIndex > -1) {
            llPlayerOrder.splice(orderIndex, 1);
        }
        // Update references
        players = llPlayers;
        playerOrder = llPlayerOrder;
    } else {
        const index = usssaPlayers.indexOf(playerName);
        if (index > -1) {
            usssaPlayers.splice(index, 1);
        }
        const orderIndex = usssaPlayerOrder.indexOf(playerName);
        if (orderIndex > -1) {
            usssaPlayerOrder.splice(orderIndex, 1);
        }
        // Update references
        players = usssaPlayers;
        playerOrder = usssaPlayerOrder;
    }
    
    // Remove from pitchingData
    delete pitchingData[playerName];
    
    // Exit delete mode after removing a player
    deleteMode = false;
    const deleteBtn = document.getElementById('deleteBtn');
    deleteBtn.textContent = 'Remove Player';
    deleteBtn.classList.remove('active');
    
    saveData();
    renderTable();
}

// Add a new player
function addPlayer() {
    if (useLittleLeague) {
        // For LL mode, show modal with name and age inputs
        const modal = document.getElementById('addLLPlayerModal');
        const nameInput = document.getElementById('llPlayerNameInput');
        const ageInput = document.getElementById('llPlayerAgeInput');
        modal.style.display = 'flex';
        nameInput.value = '';
        ageInput.value = '12';
        
        // iOS requires focus to be called synchronously
        nameInput.focus();
        nameInput.click();
        
        // Also try with requestAnimationFrame for better iOS compatibility
        requestAnimationFrame(() => {
            nameInput.focus();
            nameInput.click();
        });
        return;
    }
    
    // Original USSSA mode
    // Show custom modal instead of browser prompt
    const modal = document.getElementById('addPlayerModal');
    const input = document.getElementById('playerNameInput');
    modal.style.display = 'flex';
    input.value = '';
    
    // iOS requires focus to be called synchronously and sometimes needs click() too
    input.focus();
    input.click();
    
    // Also try with requestAnimationFrame for better iOS compatibility
    requestAnimationFrame(() => {
        input.focus();
        input.click();
    });
}

function closeAddPlayerModal() {
    const modal = document.getElementById('addPlayerModal');
    modal.style.display = 'none';
}

function closeAddLLPlayerModal() {
    const modal = document.getElementById('addLLPlayerModal');
    modal.style.display = 'none';
}

function submitAddLLPlayer() {
    const nameInput = document.getElementById('llPlayerNameInput');
    const ageInput = document.getElementById('llPlayerAgeInput');
    const playerName = nameInput.value;
    const ageValue = ageInput.value;
    
    if (!playerName) {
        closeAddLLPlayerModal();
        return;
    }
    
    const trimmedName = playerName.trim();
    if (!trimmedName) {
        alert('Player name cannot be empty');
        return;
    }
    
    if (llPlayers.includes(trimmedName)) {
        alert('Player already exists');
        return;
    }
    
    const ageNum = parseInt(ageValue);
    if (isNaN(ageNum) || ageNum < 7 || ageNum > 16) {
        alert('Please enter a valid age between 7 and 16');
        return;
    }
    
    llPlayers.push(trimmedName);
    llPlayerOrder.push(trimmedName);
    players = llPlayers;
    playerOrder = llPlayerOrder;
    playerAges[trimmedName] = ageNum;
    llPitchData[trimmedName] = { pitches: 0 };
    
    saveData();
    renderTable();
    closeAddLLPlayerModal();
}

function submitAddPlayer() {
    const input = document.getElementById('playerNameInput');
    const playerName = input.value;
    
    if (!playerName) {
        closeAddPlayerModal();
        return;
    }
    
    const trimmedName = playerName.trim();
    if (!trimmedName) {
        alert('Player name cannot be empty');
        return;
    }
    
    if (players.includes(trimmedName)) {
        alert('Player already exists');
        return;
    }
    
    usssaPlayers.push(trimmedName);
    usssaPlayerOrder.push(trimmedName);
    players = usssaPlayers;
    playerOrder = usssaPlayerOrder;
    pitchingData[trimmedName] = { day1: 0, day2: 0, day3: 0 };
    
    saveData();
    renderTable();
    closeAddPlayerModal();
}

// Import shared data functions
function openImportModal() {
    const modal = document.getElementById('importModal');
    const input = document.getElementById('importUrlInput');
    modal.style.display = 'flex';
    input.value = '';
    
    // iOS requires focus to be called synchronously
    input.focus();
    input.click();
    
    // Also try with requestAnimationFrame for better iOS compatibility
    requestAnimationFrame(() => {
        input.focus();
        input.click();
    });
}

function closeImportModal() {
    const modal = document.getElementById('importModal');
    modal.style.display = 'none';
}

function submitImport() {
    const input = document.getElementById('importUrlInput');
    const pastedText = input.value.trim();
    
    if (!pastedText) {
        closeImportModal();
        return;
    }
    
    try {
        let encodedData = null;
        
        // Check if it's a full URL or just the data parameter
        if (pastedText.includes('?data=')) {
            // It's a full URL, extract the data parameter
            const url = new URL(pastedText);
            encodedData = url.searchParams.get('data');
        } else if (pastedText.includes('data=')) {
            // It might be just the query string
            const params = new URLSearchParams(pastedText);
            encodedData = params.get('data');
        } else {
            // Assume it's just the encoded data itself
            encodedData = pastedText;
        }
        
        if (!encodedData) {
            alert('Could not find data in the pasted text. Please paste the full shared link.');
            return;
        }
        
        // Decode from base64
        const jsonString = atob(decodeURIComponent(encodedData));
        const shareData = JSON.parse(jsonString);
        
        // Load the shared data
        players = shareData.players || [];
        playerOrder = shareData.playerOrder || [];
        pitchingData = shareData.pitchingData || {};
        use13URules = shareData.use13URules || false;
        useThreeDayColumn = shareData.useThreeDayColumn || false;
        useLittleLeague = shareData.useLittleLeague || false;
        playerAges = shareData.playerAges || {};
        llPitchData = shareData.llPitchData || {};
        
        // Update UI
        updateRules();
        const checkbox = document.getElementById('use13URules');
        if (checkbox) {
            checkbox.checked = use13URules;
        }
        const threeDayCheckbox = document.getElementById('useThreeDayColumn');
        if (threeDayCheckbox) {
            threeDayCheckbox.checked = useThreeDayColumn;
        }
        
        // Set radio buttons for mode
        const usssaRadio = document.getElementById('usssaMode');
        const llRadio = document.getElementById('littleLeagueMode');
        if (useLittleLeague && llRadio) {
            llRadio.checked = true;
        } else if (usssaRadio) {
            usssaRadio.checked = true;
        }
        
        // Update UI visibility
        const title = document.getElementById('app-title');
        const header = document.getElementById('app-header');
        const usssaSettings = document.getElementById('usssa-settings');
        
        if (useLittleLeague) {
            if (title) title.textContent = 'Little League Pitching Tracker';
            if (header) header.textContent = 'Little League Pitching Tracker';
            if (usssaSettings) usssaSettings.style.display = 'none';
        } else {
            if (title) title.textContent = 'USSSA Pitching Tracker';
            if (header) header.textContent = 'USSSA Pitching Tracker';
            if (usssaSettings) usssaSettings.style.display = 'block';
        }
        
        renderTable();
        closeImportModal();
        
    } catch (error) {
        console.error('Error importing data:', error);
        alert('Error importing data. Please make sure you pasted a valid shared link.');
    }
}

// Edit player name
let currentEditingPlayer = null;

function editPlayerName(oldName) {
    currentEditingPlayer = oldName;
    const modal = document.getElementById('editPlayerModal');
    const input = document.getElementById('editPlayerNameInput');
    input.value = oldName;
    modal.style.display = 'flex';
    
    // Focus and select the text after a brief delay to ensure modal is visible
    setTimeout(() => {
        input.focus();
        input.select();
    }, 100);
}

function closeEditPlayerModal() {
    const modal = document.getElementById('editPlayerModal');
    modal.style.display = 'none';
    const input = document.getElementById('editPlayerNameInput');
    input.value = '';
    currentEditingPlayer = null;
}

function submitEditPlayer() {
    const input = document.getElementById('editPlayerNameInput');
    const newName = input.value;
    const oldName = currentEditingPlayer;
    
    if (!newName || newName === oldName) {
        closeEditPlayerModal();
        return;
    }
    
    const trimmedName = newName.trim();
    if (!trimmedName) {
        alert('Player name cannot be empty');
        return;
    }
    
    if (players.includes(trimmedName)) {
        alert('Player name already exists');
        return;
    }
    
    // Update players array
    const playerIndex = players.indexOf(oldName);
    if (playerIndex !== -1) {
        players[playerIndex] = trimmedName;
    }
    
    // Update player order
    const orderIndex = playerOrder.indexOf(oldName);
    if (orderIndex !== -1) {
        playerOrder[orderIndex] = trimmedName;
    }
    
    // Update pitching data
    pitchingData[trimmedName] = pitchingData[oldName];
    delete pitchingData[oldName];
    
    saveData();
    closeEditPlayerModal();
    renderTable();
}

// Delete a player
function deletePlayer(playerName) {
    if (!confirm(`Delete ${playerName}? This will also delete all their pitching data.`)) {
        return;
    }
    
    // Remove from arrays
    players = players.filter(p => p !== playerName);
    playerOrder = playerOrder.filter(p => p !== playerName);
    
    // Remove pitching data
    delete pitchingData[playerName];
    
    saveData();
    renderTable();
}

// Reset all data
function resetAllData() {
    if (confirm('Reset all pitching data?')) {
        players.forEach(player => {
            pitchingData[player] = {
                day1: 0,
                day2: 0,
                day3: 0
            };
        });
        saveData();
        renderTable();
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Check if there's shared data in the URL first
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('data')) {
        loadSharedData();
        
        // Clean up the URL - remove the query parameters
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
    } else {
        loadData();
    }
    
    // Set checkbox state
    const checkbox = document.getElementById('use13URules');
    if (checkbox) {
        checkbox.checked = use13URules;
    }
    
    const threeDayCheckbox = document.getElementById('useThreeDayColumn');
    if (threeDayCheckbox) {
        threeDayCheckbox.checked = useThreeDayColumn;
    }
    
    // Set radio button state
    const usssaRadio = document.getElementById('usssaMode');
    const llRadio = document.getElementById('littleLeagueMode');
    if (useLittleLeague) {
        if (llRadio) llRadio.checked = true;
    } else {
        if (usssaRadio) usssaRadio.checked = true;
    }
    
    // Update app title and header based on mode
    const title = document.getElementById('app-title');
    const header = document.getElementById('app-header');
    const usssaSettings = document.getElementById('usssa-settings');
    
    if (useLittleLeague) {
        if (title) title.textContent = 'Little League Pitching Tracker';
        if (header) header.textContent = 'Little League Pitching Tracker';
        if (usssaSettings) usssaSettings.style.display = 'none';
    } else {
        if (title) title.textContent = 'USSSA Pitching Tracker';
        if (header) header.textContent = 'USSSA Pitching Tracker';
        if (usssaSettings) usssaSettings.style.display = 'block';
    }
    
    // Lock screen orientation to portrait on mobile devices
    if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('portrait').catch(err => {
            console.log('Screen orientation lock not supported or denied:', err);
        });
    }
    
    // Add Enter key support for add player modal
    const playerNameInput = document.getElementById('playerNameInput');
    if (playerNameInput) {
        playerNameInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                submitAddPlayer();
            }
        });
    }
    
    // Add Enter key support for import modal
    const importUrlInput = document.getElementById('importUrlInput');
    if (importUrlInput) {
        importUrlInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                submitImport();
            }
        });
    }
    
    // Add Enter key support for edit player modal
    const editPlayerNameInput = document.getElementById('editPlayerNameInput');
    if (editPlayerNameInput) {
        editPlayerNameInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                submitEditPlayer();
            }
        });
    }
    
    renderRules();
    renderTable();
});

// Toggle collapsible sections
function toggleSection(sectionId) {
    const content = document.getElementById(sectionId);
    const icon = document.getElementById(sectionId + '-icon');
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        icon.textContent = '−';
    } else {
        content.style.display = 'none';
        icon.textContent = '+';
    }
}

// Update active rules based on division
function updateRules() {
    if (use13URules) {
        RULES.ONE_DAY_MAX_TO_PITCH_NEXT = RULES_13U.ONE_DAY_MAX_TO_PITCH_NEXT;
        RULES.ONE_DAY_MAX = RULES_13U.ONE_DAY_MAX;
        RULES.THREE_DAY_MAX = RULES_13U.THREE_DAY_MAX;
        RULES.NAME = RULES_13U.NAME;
    } else {
        RULES.ONE_DAY_MAX_TO_PITCH_NEXT = RULES_7U_12U.ONE_DAY_MAX_TO_PITCH_NEXT;
        RULES.ONE_DAY_MAX = RULES_7U_12U.ONE_DAY_MAX;
        RULES.THREE_DAY_MAX = RULES_7U_12U.THREE_DAY_MAX;
        RULES.NAME = RULES_7U_12U.NAME;
    }
}

// Toggle 13U rules
function toggle13URules() {
    const checkbox = document.getElementById('use13URules');
    use13URules = checkbox.checked;
    updateRules();
    saveData();
    renderRules();
    renderTable();
}

function toggleThreeDayColumn() {
    const checkbox = document.getElementById('useThreeDayColumn');
    useThreeDayColumn = checkbox.checked;
    saveData();
    renderTable();
}

// Toggle League mode (radio button handler)
function toggleLeagueMode() {
    const usssaRadio = document.getElementById('usssaMode');
    const llRadio = document.getElementById('littleLeagueMode');
    
    // Determine which mode is selected
    useLittleLeague = llRadio.checked;
    
    // Switch player lists based on mode
    if (useLittleLeague) {
        players = llPlayers;
        playerOrder = llPlayerOrder;
    } else {
        players = usssaPlayers;
        playerOrder = usssaPlayerOrder;
    }
    
    // Update app title and header
    const title = document.getElementById('app-title');
    const header = document.getElementById('app-header');
    const usssaSettings = document.getElementById('usssa-settings');
    
    if (useLittleLeague) {
        if (title) title.textContent = 'Little League Pitching Tracker';
        if (header) header.textContent = 'Little League Pitching Tracker';
        if (usssaSettings) usssaSettings.style.display = 'none';
    } else {
        if (title) title.textContent = 'USSSA Pitching Tracker';
        if (header) header.textContent = 'USSSA Pitching Tracker';
        if (usssaSettings) usssaSettings.style.display = 'block';
    }
    
    saveData();
    renderRules();
    renderTable();
}

// Render rules list
function renderRules() {
    const rulesList = document.getElementById('rules-list');
    const rulesTitle = document.getElementById('rules-title');
    
    if (useLittleLeague) {
        // Little League rules
        if (rulesTitle) {
            rulesTitle.textContent = 'Quick Reference Rules (Little League)';
        }
        if (rulesList) {
            rulesList.innerHTML = `
                <li><strong>Ages 7-8:</strong> 50 pitches max per day</li>
                <li><strong>Ages 9-10:</strong> 75 pitches max per day</li>
                <li><strong>Ages 11-12:</strong> 85 pitches max per day</li>
                <li><strong>Ages 13-16:</strong> 95 pitches max per day</li>
                <li><strong>Rest (14U):</strong> 66+ = 4 days, 51-65 = 3 days, 36-50 = 2 days, 21-35 = 1 day, 1-20 = 0 days</li>
                <li><strong>Rest (15-16):</strong> 76+ = 4 days, 61-75 = 3 days, 46-60 = 2 days, 31-45 = 1 day, 1-30 = 0 days</li>
                <li><strong>Catcher Rule:</strong> Cannot catch after pitching 41+ pitches. Cannot pitch after catching 4+ innings same day.</li>
                <li><strong>Full Rules:</strong> <a href="https://www.littleleague.org/playing-rules/pitch-count/" target="_blank" style="color: #0066cc;">Little League Pitch Count</a></li>
            `;
        }
    } else {
        // USSSA rules
        if (rulesTitle) {
            rulesTitle.textContent = `Quick Reference Rules (${RULES.NAME})`;
        }
        
        if (rulesList) {
            rulesList.innerHTML = `
                <li><strong>One Day Max to Pitch Next Day:</strong> ${RULES.ONE_DAY_MAX_TO_PITCH_NEXT} innings</li>
                <li><strong>One Day Maximum:</strong> ${RULES.ONE_DAY_MAX} innings</li>
                <li><strong>Two Day Maximum:</strong> ${RULES.THREE_DAY_MAX} innings total</li>
                <li><strong>Three Day Maximum:</strong> ${RULES.THREE_DAY_MAX} innings total</li>
                <li><strong>Mandatory Rest:</strong> After ${RULES.ONE_DAY_MAX_TO_PITCH_NEXT}+ innings in one day, ${RULES.THREE_DAY_MAX} innings in 2 days, ${RULES.THREE_DAY_MAX} innings in 3 days, or 3 consecutive days pitching</li>
            `;
        }
    }
}

// Share current data via URL
function shareData() {
    if (players.length === 0) {
        alert('No players to share. Add some players first.');
        return;
    }
    
    // Create data object to share
    const shareData = {
        players: players,
        playerOrder: playerOrder,
        pitchingData: pitchingData,
        use13URules: use13URules,
        useThreeDayColumn: useThreeDayColumn,
        useLittleLeague: useLittleLeague,
        playerAges: playerAges,
        llPitchData: llPitchData
    };
    
    // Encode data to base64 URL-safe string
    const jsonString = JSON.stringify(shareData);
    const base64Data = btoa(jsonString);
    
    // Create shareable URL
    const baseUrl = window.location.origin + window.location.pathname;
    const shareUrl = `${baseUrl}?data=${encodeURIComponent(base64Data)}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(shareUrl).then(() => {
        alert('Share link copied to clipboard!\n\nAnyone with this link can view your current pitching data.');
    }).catch(err => {
        // Fallback: show the URL in a prompt for manual copying
        prompt('Copy this link to share:', shareUrl);
    });
}

// Load shared data from URL
function loadSharedData() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const encodedData = urlParams.get('data');
        
        if (!encodedData) {
            loadData();
            return;
        }
        
        // Decode from base64
        const jsonString = atob(decodeURIComponent(encodedData));
        const shareData = JSON.parse(jsonString);
        
        // Load the shared data
        players = shareData.players || [];
        playerOrder = shareData.playerOrder || [];
        pitchingData = shareData.pitchingData || {};
        use13URules = shareData.use13URules || false;
        useThreeDayColumn = shareData.useThreeDayColumn || false;
        useLittleLeague = shareData.useLittleLeague || false;
        playerAges = shareData.playerAges || {};
        llPitchData = shareData.llPitchData || {};
        
        // Update rules based on the shared setting
        updateRules();
        
        // Don't save to localStorage automatically - it's shared data
        // User can manually save if they want by adding players or resetting
        
        console.log('Loaded shared data successfully');
    } catch (error) {
        console.error('Error loading shared data:', error);
        alert('Error loading shared data. Loading your saved data instead.');
        loadData();
    }
}
