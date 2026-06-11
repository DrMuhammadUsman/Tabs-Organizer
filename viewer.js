let allTabs = [];
let searchQuery = "";
let selectedTags = new Set();
let collapsedGroups = new Set();

document.getElementById("file-input").addEventListener("change", function(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      allTabs = JSON.parse(e.target.result);
      initViewer();
    } catch (err) {
      alert("Error parsing JSON file. Please ensure it is a valid export.");
    }
  };
  reader.readAsText(file);
});

function initViewer() {
  document.getElementById("upload-area").style.display = "none";
  document.getElementById("search-container").style.display = "block";
  document.getElementById("viewer-container").style.display = "flex";

  render();

  document.getElementById("search").addEventListener("input", (e) => {
    searchQuery = e.target.value.toLowerCase();
    render();
  });

  document.getElementById("clear-search").addEventListener("click", () => {
    document.getElementById("search").value = "";
    searchQuery = "";
    render();
  });
}

function render() {
  const filteredTabs = filterTabs();
  renderTabList(filteredTabs);
  renderTagList();
}

function filterTabs() {
  return allTabs.filter(tab => {
    const title = (tab.title || "").toLowerCase();
    const url = (tab.url || "").toLowerCase();
    
    const matchesSearch = title.includes(searchQuery) || url.includes(searchQuery);
    
    let matchesTag = true;
    if (selectedTags.size > 0) {
      const domain = getDomain(tab.url);
      matchesTag = selectedTags.has(domain);
    }

    return matchesSearch && matchesTag;
  });
}

function getDomain(url) {
  if (!url) return "Other";
  if (url.startsWith("file://")) return "Local";
  try {
    const hostname = new URL(url).hostname;
    const parts = hostname.split('.');
    
    if (parts.length >= 3) {
      const tld = parts[parts.length - 1];
      const sld = parts[parts.length - 2];
      
      if (tld.length === 2 && sld.length <= 3) {
        return parts.slice(-3).join('.');
      }
    }
    
    if (parts.length >= 2) {
      return parts.slice(-2).join('.');
    }
    return hostname;
  } catch (e) {
    return "Other";
  }
}

function getFriendlyName(domain) {
  if (domain === "Local") return "Local Files";
  if (domain === "Other") return "Other";

  const mapping = {
    'youtube.com': 'YouTube',
    'google.com': 'Google',
    'github.com': 'GitHub',
    'stackoverflow.com': 'Stack Overflow',
    'facebook.com': 'Facebook',
    'linkedin.com': 'LinkedIn',
    'twitter.com': 'Twitter',
    'x.com': 'Twitter',
    'amazon.com': 'Amazon',
    'reddit.com': 'Reddit',
    'springer.com': 'Springer',
    'whiterose.ac.uk': 'Whiterose'
  };

  if (mapping[domain]) return mapping[domain];

  const name = domain.split('.')[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function renderTabList(tabs) {
  const tabList = document.getElementById("tab-list");
  tabList.innerHTML = "";

  if (tabs.length === 0) {
    tabList.innerHTML = '<div style="padding: 20px; color: #666;">No tabs found matching your criteria.</div>';
    return;
  }

  const groups = {};
  tabs.forEach(tab => {
    const domain = getDomain(tab.url);
    if (!groups[domain]) groups[domain] = [];
    groups[domain].push(tab);
  });

  const sortedDomains = Object.keys(groups).sort();

  sortedDomains.forEach(domain => {
    const friendlyName = getFriendlyName(domain);
    const groupDiv = document.createElement("div");
    groupDiv.className = `tab-group ${collapsedGroups.has(domain) ? 'collapsed' : ''}`;

    const header = document.createElement("div");
    header.className = "group-header";
    header.innerHTML = `<span>${friendlyName} <small style="font-weight: normal; font-size: 12px; color: #666;">(${groups[domain].length} tabs)</small></span>`;
    
    header.addEventListener("click", () => {
      if (collapsedGroups.has(domain)) {
        collapsedGroups.delete(domain);
      } else {
        collapsedGroups.add(domain);
      }
      render();
    });

    groupDiv.appendChild(header);

    const itemsContainer = document.createElement("div");
    itemsContainer.className = "tab-items-container";

    groups[domain].forEach(tab => {
      const tabDiv = document.createElement("div");
      tabDiv.className = "tab-item";
      tabDiv.style.display = "flex";
      tabDiv.style.alignItems = "center";
      
      const link = document.createElement("a");
      link.href = tab.url;
      link.target = "_blank";
      link.style.textDecoration = "none";
      link.style.color = "inherit";
      link.style.display = "flex";
      link.style.alignItems = "center";
      link.style.width = "100%";

      const favicon = document.createElement("img");
      favicon.className = "tab-favicon";
      // Use the exported favicon URL or a fallback
      favicon.src = tab.favIconUrl || `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
      favicon.style.width = "16px";
      favicon.style.height = "16px";
      favicon.style.marginRight = "8px";
      favicon.style.flexShrink = "0";
      link.appendChild(favicon);

      const textContainer = document.createElement("div");
      textContainer.style.overflow = "hidden";

      const title = document.createElement("span");
      title.className = "tab-title";
      title.textContent = tab.title || "Untitled";
      textContainer.appendChild(title);

      const url = document.createElement("span");
      url.className = "tab-url";
      url.textContent = tab.url;
      textContainer.appendChild(url);

      link.appendChild(textContainer);
      tabDiv.appendChild(link);
      itemsContainer.appendChild(tabDiv);
    });

    groupDiv.appendChild(itemsContainer);
    tabList.appendChild(groupDiv);
  });
}

function renderTagList() {
  const sidebar = document.getElementById("tag-sidebar");
  sidebar.innerHTML = `
    <div class="sidebar-header">
      <h3>Tags</h3>
      ${selectedTags.size > 0 ? '<button id="clear-tags">Clear All</button>' : ''}
    </div>
    <div id="tag-list"></div>
  `;

  const tagList = document.getElementById("tag-list");
  
  if (selectedTags.size > 0) {
    document.getElementById("clear-tags").addEventListener("click", () => {
      selectedTags.clear();
      render();
    });
  }

  const domains = [...new Set(allTabs.map(t => getDomain(t.url)))].sort();

  domains.forEach(domain => {
    const friendlyName = getFriendlyName(domain);
    const tag = document.createElement("span");
    tag.className = `tag ${selectedTags.has(domain) ? 'active' : ''}`;
    tag.textContent = friendlyName;
    
    tag.addEventListener("click", () => {
      if (selectedTags.has(domain)) {
        selectedTags.delete(domain);
      } else {
        selectedTags.add(domain);
      }
      render();
    });

    tagList.appendChild(tag);
  });
}
