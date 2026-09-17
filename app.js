Certainly! Below is a complete, updated JavaScript (`app.js`) file that:

- Fetches book data from **Open Library**, **Google Books API**, **Library of Congress**, and **Publishers Weekly** RSS via rss2json.com.
- Loosens publication date filtering (last 3 years) but keeps books missing dates.
- Logs fetched data for debugging.
- Merges, deduplicates, filters, sorts, and displays results in a Netflix-style layout.

You can replace your existing `app.js` with this code.

```javascript
const answerTagMap = {
  vibe: {
    cozy: ["romance", "slice_of_life", "light_fiction"],
    thrilling: ["thriller", "suspense", "adventure"],
    deep: ["literary_fiction", "classics", "historical"],
    humorous: ["comedy", "contemporary"]
  },
  storyStyle: {
    epic: ["fantasy", "science_fiction"],
    real_life: ["contemporary", "drama"],
    mystery: ["mystery", "crime"],
    historical: ["historical", "biography"]
  },
  setting: {
    futuristic: ["science_fiction"],
    enchanted: ["fantasy"],
    small_town: ["romance", "slice_of_life"],
    past_era: ["historical"]
  },
  character: {
    hero: ["adventure", "fantasy"],
    underdog: ["drama", "contemporary"],
    detective: ["mystery", "crime"],
    lover: ["romance"]
  },
  length: {
    short: "under_300",
    medium: "300_500",
    long: "500_plus"
  },
  complexity: {
    complex: ["literary_fiction", "classics"],
    simple: ["light_fiction", "contemporary"]
  },
  humor: {
    very: ["comedy"],
    some: ["light_fiction"],
    none: []
  },
  ending: {
    happy: ["feel_good"],
    bittersweet: ["bittersweet", "thought_provoking"],
    open: ["open_ended"]
  },
  authors: {
    "J.K. Rowling": ["fantasy"],
    "Stephen King": ["horror", "thriller"],
    "Agatha Christie": ["mystery"],
    "Neil Gaiman": ["fantasy", "literary_fiction"],
    "Jane Austen": ["romance", "classics"],
    "George R.R. Martin": ["fantasy"],
    "Margaret Atwood": ["literary_fiction", "sci_fi"],
    "Haruki Murakami": ["magical_realism", "literary_fiction"],
    "Isabel Allende": ["historical", "magical_realism"]
  }
};

const currentYear = new Date().getFullYear();

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("preference-form");
  const recommendationsDiv = document.getElementById("recommendations");
  const authorCheckboxes = document.querySelectorAll("input[name='authors']");
  const maxAuthorSelections = 3;

  authorCheckboxes.forEach(cb => {
    cb.addEventListener("change", () => {
      const checked = [...authorCheckboxes].filter(c => c.checked);
      if (checked.length > maxAuthorSelections) {
        cb.checked = false;
        alert("You can select up to 3 authors only.");
      }
    });
  });

  async function fetchBooksBySubject(subject) {
    const url = `https://openlibrary.org/subjects/${encodeURIComponent(subject)}.json?limit=20`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Open Library fetch failed");
      const json = await res.json();
      console.log(`Open Library books for '${subject}':`, json.works);
      return json.works || [];
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  async function fetchBooksGoogle(subject) {
    const url = `https://www.googleapis.com/books/v1/volumes?q=subject:${encodeURIComponent(subject)}&maxResults=20`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Google Books fetch failed");
      const data = await res.json();
      console.log(`Google Books for '${subject}':`, data.items);
      return (data.items || []).map(item => {
        const v = item.volumeInfo;
        return {
          source: "google",
          id: item.id,
          title: v.title,
          authors: v.authors || [],
          publishedDate: v.publishedDate || "",
          cover_id: v.imageLinks ? v.imageLinks.thumbnail : "",
          description: v.description || ""
        };
      });
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  async function fetchLocBooks(keyword) {
    const url = `https://www.loc.gov/books/?fo=json&q=${encodeURIComponent(keyword)}&c=20`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Library of Congress fetch failed");
      const data = await res.json();
      console.log(`Library of Congress books for '${keyword}':`, data.results);
      return (data.results || []).map(item => ({
        source: "loc",
        id: item.id || item.url,
        title: item.title,
        authors: item.contributors || [],
        publishedDate: item.date || "",
        cover_id: "", // no direct cover available
        description: item.description || ""
      }));
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  async function fetchPublishersWeekly() {
    const rssUrl = encodeURIComponent(
      "https://publishersweekly.com/pw/rss/current.xml"
    );
    const jsonApi = `https://api.rss2json.com/v1/api.json?rss_url=${rssUrl}`;
    try {
      const res = await fetch(jsonApi);
      if (!res.ok) throw new Error("Publishers Weekly fetch failed");
      const data = await res.json();
      console.log("Publishers Weekly RSS items:", data.items);
      return (data.items || []).map(item => ({
        source: "publishersweekly",
        id: item.guid || item.link,
        title: item.title,
        authors: [],
        publishedDate: "",
        cover_id: item.thumbnail || "",
        description: item.link
      }));
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();
    recommendationsDiv.innerHTML = "<p>Loading recommendations...</p>";

    const answers = {
      vibe: form.elements["vibe"].value,
      storyStyle: form.elements["storyStyle"].value,
      setting: form.elements["setting"].value,
      character: form.elements["character"].value,
      length: form.elements["length"].value,
      complexity: form.elements["complexity"].value,
      humor: form.elements["humor"].value,
      ending: form.elements["ending"].value,
      authors: [...form.elements["authors"]]
        .filter(a => a.checked)
        .map(a => a.value),
      newOrOld: form.elements["newOrOld"].value
    };

    let tags = [];
    tags = tags.concat(answerTagMap.vibe[answers.vibe] || []);
    tags = tags.concat(answerTagMap.storyStyle[answers.storyStyle] || []);
    tags = tags.concat(answerTagMap.setting[answers.setting] || []);
    tags = tags.concat(answerTagMap.character[answers.character] || []);
    tags = tags.concat(answerTagMap.complexity[answers.complexity] || []);
    tags = tags.concat(answerTagMap.humor[answers.humor] || []);
    tags = tags.concat(answerTagMap.ending[answers.ending] || []);
    answers.authors.forEach(author => {
      tags = tags.concat(answerTagMap.authors[author] || []);
    });

    tags = [...new Set(tags)].map(t => t.replace(/_/g, " "));

    let pageFilter = null;
    if (answers.length === "short") pageFilter = 300;
    else if (answers.length === "medium") pageFilter = 500;

    let yearFilterMin = 0;
    let yearFilterMax = currentYear;
    if (answers.newOrOld === "new") {
      yearFilterMin = currentYear - 3;
    } else if (answers.newOrOld === "old") {
      yearFilterMax = currentYear - 4;
    }

    recommendationsDiv.innerHTML = "";
    let allBooks = [];
    const queryTags = tags.slice(0, 3);

    for (const tag of queryTags) {
      const olRaw = await fetchBooksBySubject(tag);
      const olBooks = olRaw.map(b => ({
        source: "openlibrary",
        id: b.key,
        title: b.title,
        authors: b.authors ? b.authors.map(a => a.name) : [],
        publishedDate: b.first_publish_year
          ? b.first_publish_year.toString()
          : "",
        cover_id: b.cover_id,
        description: b.description || ""
      }));

      const googleBooks = await fetchBooksGoogle(tag);

      const locBooks = await fetchLocBooks(tag);

      allBooks = allBooks.concat(olBooks, googleBooks, locBooks);
    }

    const pwBooks = await fetchPublishersWeekly();
    allBooks = allBooks.concat(pwBooks);

    const uniqueMap = new Map();
    allBooks.forEach(book => {
      const key = `${book.source}_${book.id}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, book);
    });
    allBooks = Array.from(uniqueMap.values());

    allBooks = allBooks.filter(b => {
      if (!b.publishedDate) return true;
      const yearMatch = b.publishedDate.match(/\d{4}/);
      if (!yearMatch) return true;
      const year = parseInt(yearMatch[0], 10);
      return year >= yearFilterMin && year <= yearFilterMax;
    });

    if (answers.authors.length > 0) {
      allBooks.sort((a, b) => {
        const aPref = a.authors.some(au => answers.authors.includes(au));
        const bPref = b.authors.some(au => answers.authors.includes(au));
        if (aPref && !bPref) return -1;
        if (!aPref && bPref) return 1;
        return 0;
      });
    }

    if (allBooks.length === 0) {
      recommendationsDiv.innerHTML =
        "<p>No recommendations found based on your preferences. Try adjusting your choices.</p>";
      return;
    }

    const laneDiv = document.createElement("section");
    laneDiv.className = "lane";
    const laneTitle = document.createElement("h2");
    laneTitle.textContent =
      "Recommended for you — combined from multiple sources";
    laneDiv.appendChild(laneTitle);

    const bookListDiv = document.createElement("div");
    bookListDiv.className = "book-list";

    allBooks.slice(0, 30).forEach(book => {
      const bookDiv = document.createElement("div");
      bookDiv.className = "book";

      const img = document.createElement("img");
      if (book.cover_id) {
        img.src =
          book.source === "openlibrary"
            ? `https://covers.openlibrary.org/b/id/${book.cover_id}-M.jpg`
            : book.cover_id;
      } else {
        img.src = "https://via.placeholder.com/120x180?text=No+Cover";
      }
      img.alt = book.title;
      bookDiv.appendChild(img);

      const title = document.createElement("div");
      title.className = "book-title";
      title.textContent = book.title;
      bookDiv.appendChild(title);

      const authorDiv = document.createElement("div");
      authorDiv.className = "book-author";
      authorDiv.textContent = book.authors.length
        ? book.authors.join(", ")
        : "Unknown author";
      bookDiv.appendChild(authorDiv);

      const explanationDiv = document.createElement("div");
      explanationDiv.className = "explanation";
      explanationDiv.innerHTML = `From <strong>${
        book.source === "openlibrary"
          ? "Open Library"
          : book.source === "google"
          ? "Google Books"
          : book.source === "loc"
          ? "Library of Congress"
          : "Publishers Weekly"
      }</strong>`;
      if (book.description && book.description.length < 120) {
        explanationDiv.innerHTML += `<br><em>${book.description}</em>`;
      } else if (book.description) {
        explanationDiv.innerHTML += `<br><em>${book.description.substring(
          0,
          120
        )}...</em>`;
      }
      bookDiv.appendChild(explanationDiv);

      bookListDiv.appendChild(bookDiv);
    });

    laneDiv.appendChild(bookListDiv);
    recommendationsDiv.appendChild(laneDiv);
  });
});
```

