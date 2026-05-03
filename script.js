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
// Player list (dynamic)
let players = [];
let playerOrder = [];
let deleteMode = false;
let use13URules = false;
let useThreeDayColumn = false;
let activeDay = 'day1'; // Track which day column is currently active

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

// Initialize data storage
let pitchingData = {};

// Load saved data from localStorage
function loadData() {
    // Load players first
    const savedPlayers = localStorage.getItem('players');
    if (savedPlayers) {
        players = JSON.parse(savedPlayers);
    } else {
        // Default players if none saved
        players = [];
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
    
    // Load player order
    const savedOrder = localStorage.getItem('playerOrder');
    if (savedOrder) {
        playerOrder = JSON.parse(savedOrder);
        // Ensure all players are in the order array
        players.forEach(player => {
            if (!playerOrder.includes(player)) {
                playerOrder.push(player);
            }
        });
        // Remove any players from order that no longer exist
        playerOrder = playerOrder.filter(player => players.includes(player));
    } else {
        playerOrder = [...players];
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
}

// Save data to localStorage
function saveData() {
    localStorage.setItem('players', JSON.stringify(players));
    localStorage.setItem('pitchingData', JSON.stringify(pitchingData));
    localStorage.setItem('playerOrder', JSON.stringify(playerOrder));
    localStorage.setItem('use13URules', JSON.stringify(use13URules));
    localStorage.setItem('useThreeDayColumn', JSON.stringify(useThreeDayColumn));
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

// Calculate innings left for a specific day
function getInningsLeftForDay(player, day) {
    const data = pitchingData[player];
    const day1 = parseFloat(data.day1) || 0;
    const day2 = parseFloat(data.day2) || 0;
    const day3 = parseFloat(data.day3) || 0;
    const totalInnings = day1 + day2 + day3;
    
    if (day === 'day1') {
        // Day 1: limited by daily max and tournament total
        const dailyRemaining = Math.max(0, RULES.ONE_DAY_MAX - day1);
        const tournamentRemaining = Math.max(0, RULES.THREE_DAY_MAX - totalInnings);
        return Math.min(dailyRemaining, tournamentRemaining);
    } else if (day === 'day2') {
        // Day 2: check rest requirements from Day 1
        if (day1 > RULES.ONE_DAY_MAX_TO_PITCH_NEXT) {
            // Must rest - cannot pitch
            return 0;
        }
        // Can pitch: limited by daily max and tournament total
        const dailyRemaining = Math.max(0, RULES.ONE_DAY_MAX - day2);
        const tournamentRemaining = Math.max(0, RULES.THREE_DAY_MAX - totalInnings);
        return Math.min(dailyRemaining, tournamentRemaining);
    } else { // day3
        // Day 3: check rest requirements from Day 2
        if (day2 > RULES.ONE_DAY_MAX_TO_PITCH_NEXT) {
            // Must rest - cannot pitch
            return 0;
        }
        // Can pitch: limited by daily max and tournament total
        const dailyRemaining = Math.max(0, RULES.ONE_DAY_MAX - day3);
        const tournamentRemaining = Math.max(0, RULES.THREE_DAY_MAX - totalInnings);
        return Math.min(dailyRemaining, tournamentRemaining);
    }
}

// Set active day and re-render
function setActiveDay(day) {
    activeDay = day;
    renderTable();
}

// Update column headers to show which is active
function updateColumnHeaders() {
    const day1Header = document.querySelector('th:nth-child(3)'); // Day 1
    const day2Header = document.querySelector('th:nth-child(4)'); // Day 2
    const day3Header = document.querySelector('th:nth-child(5)'); // Day 3
    
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

// Create table rows
function renderTable() {
    const tbody = document.getElementById('pitchingTableBody');
    const table = document.getElementById('pitchingTable');
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
            day2Cell = `<td><span class="innings-value">${decimalToFraction(day2)}</span></td>`;
            day3Cell = `<td><span class="innings-value">${decimalToFraction(day3)}</span></td>`;
        } else if (activeDay === 'day2') {
            day1Cell = `<td><span class="innings-value">${decimalToFraction(day1)}</span></td>`;
            day2Cell = `
                <td class="active-day">
                    <div class="innings-counter">
                        <button class="counter-btn counter-btn-up" onclick="incrementInnings('${player}', 'day2')" ${day2 >= day2Max ? 'disabled' : ''}>▲</button>
                        <span class="innings-value">${decimalToFraction(day2)}</span>
                        <button class="counter-btn counter-btn-down" onclick="decrementInnings('${player}', 'day2')" ${day2 <= 0 ? 'disabled' : ''}>▼</button>
                    </div>
                </td>`;
            day3Cell = `<td><span class="innings-value">${decimalToFraction(day3)}</span></td>`;
        } else { // day3
            day1Cell = `<td><span class="innings-value">${decimalToFraction(day1)}</span></td>`;
            day2Cell = `<td><span class="innings-value">${decimalToFraction(day2)}</span></td>`;
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
    
    // Remove from players array
    const index = players.indexOf(playerName);
    if (index > -1) {
        players.splice(index, 1);
    }
    
    // Remove from playerOrder
    const orderIndex = playerOrder.indexOf(playerName);
    if (orderIndex > -1) {
        playerOrder.splice(orderIndex, 1);
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
    
    players.push(trimmedName);
    playerOrder.push(trimmedName);
    pitchingData[trimmedName] = { day1: 0, day2: 0, day3: 0 };
    
    saveData();
    renderTable();
    closeAddPlayerModal();
}

// Edit player name
function editPlayerName(oldName) {
    const newName = prompt('Edit player name:', oldName);
    if (!newName || newName === oldName) return;
    
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

// Render rules list
function renderRules() {
    const rulesList = document.getElementById('rules-list');
    const rulesTitle = document.getElementById('rules-title');
    
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
        useThreeDayColumn: useThreeDayColumn
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
