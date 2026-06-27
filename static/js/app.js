// State Management
let releaseNotes = [];
let activeFilter = 'all';
let searchQuery = '';
let sortBy = 'newest';
let selectedRelease = null;

// DOM Elements
const refreshBtn = document.getElementById('refresh-btn');
const refreshIcon = document.getElementById('refresh-icon');
const lastUpdatedText = document.getElementById('last-updated-text');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search-btn');
const filterTabs = document.getElementById('filter-tabs');
const sortSelect = document.getElementById('sort-select');
const releasesFeed = document.getElementById('releases-feed');
const skeletonLoader = document.getElementById('skeleton-loader');
const emptyState = document.getElementById('empty-state');
const resetFiltersBtn = document.getElementById('reset-filters-btn');

// Modal Elements
const tweetModal = document.getElementById('tweet-modal');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCounter = document.getElementById('char-counter');
const characterProgress = document.getElementById('character-progress');
const tweetWarning = document.getElementById('tweet-warning');
const closeModalBtn = document.getElementById('close-modal-btn');
const copyTweetBtn = document.getElementById('copy-tweet-btn');
const sendTweetBtn = document.getElementById('send-tweet-btn');

// Toast Elements
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    fetchReleases();
    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    // Refresh button click
    refreshBtn.addEventListener('click', () => fetchReleases(true));

    // Search input
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim().toLowerCase();
        clearSearchBtn.style.display = searchQuery ? 'block' : 'none';
        applyFiltersAndSort();
    });

    // Clear search
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        applyFiltersAndSort();
        searchInput.focus();
    });

    // Filter tabs
    filterTabs.addEventListener('click', (e) => {
        const tab = e.target.closest('.filter-tab');
        if (!tab) return;

        // Update active class
        document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        activeFilter = tab.getAttribute('data-filter');
        applyFiltersAndSort();
    });

    // Sort select
    sortSelect.addEventListener('change', (e) => {
        sortBy = e.target.value;
        applyFiltersAndSort();
    });

    // Reset filters empty state button
    resetFiltersBtn.addEventListener('click', resetFilters);

    // Modal Close
    closeModalBtn.addEventListener('click', closeTweetModal);
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) closeTweetModal();
    });

    // Textarea input for character counting
    tweetTextarea.addEventListener('input', updateCharCounter);

    // Modal Action Buttons
    copyTweetBtn.addEventListener('click', copyTweetText);
    sendTweetBtn.addEventListener('click', sendTweetText);
}

// Fetch Release Notes
async function fetchReleases(forceRefresh = false) {
    // Show loading skeleton, hide feed and empty state
    skeletonLoader.style.display = 'flex';
    emptyState.style.display = 'none';
    
    // Clear previous dynamic notes
    const cards = releasesFeed.querySelectorAll('.release-card');
    cards.forEach(card => card.remove());

    // Spin refresh icon
    refreshBtn.disabled = true;
    refreshIcon.classList.add('spinning');

    try {
        const url = `/api/releases${forceRefresh ? '?refresh=true' : ''}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.status === 'success' || result.status === 'warning') {
            releaseNotes = result.data;
            
            // Format Last Updated Time
            const dateObj = new Date(result.last_fetched * 1000);
            const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const dateStr = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });
            lastUpdatedText.textContent = `Updated: ${dateStr} at ${timeStr}`;
            
            if (result.status === 'warning') {
                showToast(result.message, 'warning');
            }
            
            applyFiltersAndSort();
        } else {
            throw new Error(result.message || 'Unknown backend error');
        }
    } catch (error) {
        console.error('Failed to fetch release notes:', error);
        showToast('Error loading release notes feed', 'error');
        
        // Hide skeleton and show empty state
        skeletonLoader.style.display = 'none';
        emptyState.style.display = 'block';
    } finally {
        // Stop spinning and enable button
        refreshIcon.classList.remove('spinning');
        refreshBtn.disabled = false;
    }
}

// Reset Filters
function resetFilters() {
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.style.display = 'none';
    
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.filter-tab[data-filter="all"]').classList.add('active');
    activeFilter = 'all';
    
    sortSelect.value = 'newest';
    sortBy = 'newest';
    
    applyFiltersAndSort();
}

// Filter and Sort Data
function applyFiltersAndSort() {
    // 1. Filter
    let filtered = releaseNotes.filter(note => {
        // Filter by category tab
        const category = note.category || 'Update';
        let matchesCategory = true;
        
        if (activeFilter === 'Feature') {
            matchesCategory = category === 'Feature';
        } else if (activeFilter === 'Change') {
            matchesCategory = category === 'Change';
        } else if (activeFilter === 'Deprecation') {
            matchesCategory = category === 'Deprecation' || category.toLowerCase().includes('deprecat');
        } else if (activeFilter === 'other') {
            matchesCategory = !['Feature', 'Change', 'Deprecation'].includes(category) && !category.toLowerCase().includes('deprecat');
        }
        
        // Filter by search query
        let matchesSearch = true;
        if (searchQuery) {
            const dateText = (note.date || '').toLowerCase();
            const catText = category.toLowerCase();
            const mainText = (note.text || '').toLowerCase();
            matchesSearch = dateText.includes(searchQuery) || 
                            catText.includes(searchQuery) || 
                            mainText.includes(searchQuery);
        }
        
        return matchesCategory && matchesSearch;
    });
    
    // 2. Sort
    filtered.sort((a, b) => {
        const dateA = new Date(a.iso_date || a.date);
        const dateB = new Date(b.iso_date || b.date);
        return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });
    
    // Hide skeleton and render
    skeletonLoader.style.display = 'none';
    renderReleases(filtered);
}

// Render Releases to the DOM
function renderReleases(notes) {
    // Remove existing cards (leaving skeleton container, which is hidden)
    const existingCards = releasesFeed.querySelectorAll('.release-card');
    existingCards.forEach(card => card.remove());
    
    if (notes.length === 0) {
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    notes.forEach((note, index) => {
        const card = document.createElement('article');
        
        // Setup classes
        const catClass = (note.category || 'update').toLowerCase();
        let catColorClass = 'category-other';
        if (catClass === 'feature') catColorClass = 'category-feature';
        else if (catClass === 'change') catColorClass = 'category-change';
        else if (catClass.includes('deprecat')) catColorClass = 'category-deprecation';
        else if (catClass === 'update') catColorClass = 'category-update';
        
        card.className = `release-card ${catColorClass}`;
        
        // Header
        const header = document.createElement('div');
        header.className = 'card-header';
        
        // Badge styling
        let badgeColor = 'badge-other';
        if (catClass === 'feature') badgeColor = 'badge-feature';
        else if (catClass === 'change') badgeColor = 'badge-change';
        else if (catClass.includes('deprecat')) badgeColor = 'badge-deprecation';
        else if (catClass === 'update') badgeColor = 'badge-update';
        
        header.innerHTML = `
            <span class="badge ${badgeColor}">${note.category || 'Update'}</span>
            <span class="card-date"><i class="fa-regular fa-calendar"></i> ${note.date}</span>
        `;
        
        // Body (renders original HTML structure safe from feed)
        const body = document.createElement('div');
        body.className = 'card-body';
        body.innerHTML = note.html;
        
        // Ensure links in HTML body open in new tab
        const bodyLinks = body.querySelectorAll('a');
        bodyLinks.forEach(link => {
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener noreferrer');
        });
        
        // Footer
        const footer = document.createElement('div');
        footer.className = 'card-footer';
        
        const docsBtn = document.createElement('a');
        docsBtn.href = note.link;
        docsBtn.target = '_blank';
        docsBtn.rel = 'noopener noreferrer';
        docsBtn.className = 'btn btn-card-link';
        docsBtn.innerHTML = `<i class="fa-solid fa-arrow-up-right-from-square"></i> Read Docs`;
        
        const tweetBtn = document.createElement('button');
        tweetBtn.className = 'btn btn-card-tweet';
        tweetBtn.innerHTML = `<i class="fa-brands fa-x-twitter"></i> Tweet`;
        tweetBtn.addEventListener('click', () => openTweetModal(note));
        
        footer.appendChild(docsBtn);
        footer.appendChild(tweetBtn);
        
        // Append all to card
        card.appendChild(header);
        card.appendChild(body);
        card.appendChild(footer);
        
        releasesFeed.appendChild(card);
    });
}

// Generate an optimized draft text for the tweet that fits X/Twitter rules
function generateTweetDraft(release) {
    const category = release.category || 'Update';
    
    // Hashtags and links take a specific length on Twitter, but let's count them
    // Twitter wraps URLs to 23 characters internally, but let's be conservative.
    const url = release.link;
    const header = `BigQuery ${category}: `;
    const footer = `\n\nRead details: ${url}\n#BigQuery #GoogleCloud`;
    
    // Calculate space left for the main description text
    // URL counts as 23 characters in Twitter's model.
    const twitterUrlLength = 23;
    const mockFooterLength = `\n\nRead details: `.length + twitterUrlLength + `\n#BigQuery #GoogleCloud`.length;
    const reservedLength = header.length + mockFooterLength;
    const maxLength = 280;
    const spaceForText = maxLength - reservedLength;
    
    let mainText = release.text.trim();
    if (mainText.length > spaceForText) {
        // Truncate clean on space if possible
        let truncated = mainText.substring(0, spaceForText - 3);
        const lastSpace = truncated.lastIndexOf(' ');
        if (lastSpace > spaceForText * 0.8) {
            truncated = truncated.substring(0, lastSpace);
        }
        mainText = truncated + '...';
    }
    
    return `${header}${mainText}${footer}`;
}

// Open Tweet Composer Modal
function openTweetModal(release) {
    selectedRelease = release;
    
    // Generate draft
    const draftText = generateTweetDraft(release);
    tweetTextarea.value = draftText;
    
    // Update counter
    updateCharCounter();
    
    // Open modal
    tweetModal.classList.add('open');
    tweetTextarea.focus();
    // Scroll cursor to end
    tweetTextarea.selectionStart = tweetTextarea.selectionEnd = tweetTextarea.value.length;
}

// Close Tweet Composer Modal
function closeTweetModal() {
    tweetModal.classList.remove('open');
    selectedRelease = null;
}

// Update Character Counter and visual progress bar
function updateCharCounter() {
    const text = tweetTextarea.value;
    const length = text.length;
    
    charCounter.textContent = `${length} / 280`;
    
    // Progress calculation
    const percentage = Math.min((length / 280) * 100, 100);
    characterProgress.style.width = `${percentage}%`;
    
    // Visual indicators
    characterProgress.className = 'progress-bar';
    if (length > 280) {
        characterProgress.classList.add('error');
        tweetWarning.style.display = 'block';
        sendTweetBtn.disabled = true;
        sendTweetBtn.style.opacity = 0.5;
    } else {
        tweetWarning.style.display = 'none';
        sendTweetBtn.disabled = false;
        sendTweetBtn.style.opacity = 1;
        
        if (length > 250) {
            characterProgress.classList.add('warning');
        }
    }
}

// Copy Tweet text to Clipboard
async function copyTweetText() {
    try {
        await navigator.clipboard.writeText(tweetTextarea.value);
        showToast('Tweet copied to clipboard!');
    } catch (err) {
        console.error('Failed to copy text: ', err);
        showToast('Failed to copy to clipboard', 'error');
    }
}

// Send Tweet (Open X/Twitter intent)
function sendTweetText() {
    const text = tweetTextarea.value;
    if (text.length > 280) {
        showToast('Tweet exceeds character limit!', 'error');
        return;
    }
    
    const encodedText = encodeURIComponent(text);
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
    
    window.open(twitterUrl, '_blank', 'noopener,noreferrer');
    closeTweetModal();
}

// Toast Helper
let toastTimeout;
function showToast(message, type = 'success') {
    clearTimeout(toastTimeout);
    
    toastMessage.textContent = message;
    
    // Style toast based on type
    toast.className = 'toast-notification';
    if (type === 'success') {
        toast.style.background = 'rgba(16, 185, 129, 0.95)';
        toast.style.boxShadow = '0 10px 25px rgba(16, 185, 129, 0.3)';
        toast.querySelector('i').className = 'fa-solid fa-circle-check';
    } else if (type === 'error') {
        toast.style.background = 'rgba(239, 68, 68, 0.95)';
        toast.style.boxShadow = '0 10px 25px rgba(239, 68, 68, 0.3)';
        toast.querySelector('i').className = 'fa-solid fa-circle-exclamation';
    } else if (type === 'warning') {
        toast.style.background = 'rgba(245, 158, 11, 0.95)';
        toast.style.boxShadow = '0 10px 25px rgba(245, 158, 11, 0.3)';
        toast.querySelector('i').className = 'fa-solid fa-triangle-exclamation';
    }
    
    toast.classList.add('show');
    
    toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
