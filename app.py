import time
import requests
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
cache = {
    "data": None,
    "last_fetched": 0
}
CACHE_TTL = 3600  # Cache duration of 1 hour

def fetch_and_parse_feed():
    """
    Fetches the BigQuery Atom feed and parses it into individual update items.
    """
    response = requests.get(FEED_URL, timeout=15)
    response.raise_for_status()
    
    root = ET.fromstring(response.content)
    namespaces = {'atom': 'http://www.w3.org/2005/Atom'}
    entries = root.findall('.//atom:entry', namespaces)
    
    parsed_updates = []
    
    for entry in entries:
        title_date = entry.find('atom:title', namespaces).text or "Unknown Date"
        updated_iso = entry.find('atom:updated', namespaces).text or ""
        link_node = entry.find('atom:link', namespaces)
        link_url = link_node.attrib.get('href') if link_node is not None else FEED_URL
        content_node = entry.find('atom:content', namespaces)
        content_html = content_node.text if content_node is not None else ""
        
        if not content_html.strip():
            continue
            
        soup = BeautifulSoup(content_html, 'html.parser')
        h3_tags = soup.find_all('h3')
        
        # If there are no h3 tags, we treat the whole content as one item
        if not h3_tags:
            item_text = soup.get_text(separator=' ', strip=True)
            # Create a clean snippet
            snippet = item_text[:180] + "..." if len(item_text) > 180 else item_text
            parsed_updates.append({
                'date': title_date,
                'iso_date': updated_iso,
                'link': link_url,
                'category': 'Update',
                'html': content_html,
                'text': item_text,
                'snippet': snippet
            })
        else:
            # Parse individual items starting with <h3>
            for h3 in h3_tags:
                category = h3.get_text(strip=True)
                
                # Collect sibling tags until the next <h3>
                sibling_html = []
                curr = h3.next_sibling
                while curr and curr.name != 'h3':
                    if curr.name:  # Only add tag elements (like p, ul, ol, div)
                        sibling_html.append(str(curr))
                    elif isinstance(curr, str) and curr.strip():  # Text nodes if any
                        sibling_html.append(curr)
                    curr = curr.next_sibling
                
                item_html = "".join(sibling_html).strip()
                item_soup = BeautifulSoup(item_html, 'html.parser')
                item_text = item_soup.get_text(separator=' ', strip=True)
                snippet = item_text[:180] + "..." if len(item_text) > 180 else item_text
                
                # Create anchor tag URL link if it matches
                anchor = title_date.replace(" ", "_").replace(",", "")
                item_link = f"{link_url.split('#')[0]}#{anchor}"
                
                parsed_updates.append({
                    'date': title_date,
                    'iso_date': updated_iso,
                    'link': item_link,
                    'category': category,
                    'html': item_html,
                    'text': item_text,
                    'snippet': snippet
                })
                
    # Sort updates by date descending (using ISO format)
    parsed_updates.sort(key=lambda x: x.get('iso_date', ''), reverse=True)
    return parsed_updates

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    refresh_param = request.args.get('refresh', 'false').lower() == 'true'
    now = time.time()
    
    # Check if we should fetch fresh data (manual refresh or expired cache or no cache)
    if refresh_param or not cache["data"] or (now - cache["last_fetched"] > CACHE_TTL):
        try:
            cache["data"] = fetch_and_parse_feed()
            cache["last_fetched"] = now
            return jsonify({
                "status": "success",
                "source": "network",
                "data": cache["data"],
                "last_fetched": cache["last_fetched"]
            })
        except Exception as e:
            # Fallback to cache if request fails but we have previous data
            if cache["data"]:
                return jsonify({
                    "status": "warning",
                    "message": f"Could not fetch fresh data. Using cached notes. (Error: {str(e)})",
                    "source": "cache",
                    "data": cache["data"],
                    "last_fetched": cache["last_fetched"]
                })
            else:
                return jsonify({
                    "status": "error",
                    "message": f"Failed to fetch release notes: {str(e)}"
                }), 500
                
    return jsonify({
        "status": "success",
        "source": "cache",
        "data": cache["data"],
        "last_fetched": cache["last_fetched"]
    })

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
