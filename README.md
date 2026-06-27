# BigQuery Release Notes Hub 🚀

A modern, high-performance web application built with **Python Flask** and vanilla **HTML, CSS, and JavaScript**. It aggregates Google Cloud's BigQuery Release Notes Atom feed, parses it down to individual updates, and renders them in a gorgeous glassmorphic timeline interface. Users can search, filter, and draft tailored updates to share instantly on X/Twitter.

---

## ✨ Features

- **Granular Feed Dissection**: Splits bulk daily release notes (which usually share a single feed entry) into separate, shareable cards (e.g. distinct *Features*, *Changes*, or *Deprecations*) using BeautifulSoup HTML parsing on the server.
- **Ambient Glassmorphic Design**: A premium dark-mode interface with background glowing vector blobs, visual badges, and micro-animations styled with modern CSS variables.
- **Client-Side State Controllers**: Perform instant keyword searching, filter by release categories, and sort by date (newest/oldest) without page refreshes.
- **Simulated Tweet Composer**: An interactive, custom-designed modal for drafting and reviewing posts. It handles Twitter's internal URL-wrapping length mechanics, features a real-time character progress bar, and launches the official X/Twitter Intent portal.
- **Robust Cache Strategy**: Built-in memory caching (1-hour TTL) speeds up response latency. It gracefully falls back to cached data if Google's feed goes down or is slow to respond, with a visual warning toast for the user.

---

## 🛠️ Technology Stack

- **Backend**: Python, Flask, Requests, BeautifulSoup4, XML ElementTree
- **Frontend**: Vanilla HTML5, Vanilla CSS3 (Custom Variables, Flexbox, Grid), Vanilla JavaScript (ES6+), FontAwesome Icons, Google Fonts (Outfit, Inter)

---

## 📁 File Structure

```text
bq-releases-notes/
├── static/
│   ├── css/
│   │   └── style.css       # Custom stylesheets (variables, theme, animations)
│   └── js/
│       └── app.js          # Client-side state, API calls, search/filter pipeline
├── templates/
│   └── index.html          # Core HTML dashboard & custom tweet modal
├── .gitignore              # Configured Git ignore patterns
├── app.py                  # Main Flask application entrypoint & backend feed parsing
├── README.md               # Project documentation
└── requirements.txt        # Python package dependencies
```

---

## 🚀 Getting Started

### Prerequisites
Make sure you have **Python 3.8+** and **pip** installed on your machine.

### Installation & Run

1. **Clone or Navigate to the Directory**:
   ```bash
   cd "C:\Users\Meenakshi S\agy-cli-projects\bq-releases-notes"
   ```

2. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the Development Server**:
   ```bash
   python app.py
   ```

4. **Access the Application**:
   Open your browser and navigate to:
   [http://127.0.0.1:5000](http://127.0.0.1:5000)

---

## 📝 Disclaimer
This project is an independent tool built to track BigQuery updates and is not affiliated with, sponsored by, or endorsed by Google LLC or Twitter/X Corp.
