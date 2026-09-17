// Mapping answers to tags
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

  // Limit author selection to 3
  authorCheckboxes.forEach(cb => {
    cb.addEventListener("change", () => {
      const checked = [...authorCheckboxes].filter(c => c.checked);
      if (checked.length > maxAuthorSelections) {
        cb.checked = false; // revert change
        alert("You can select up to 3 authors only.");
      }
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    recommendationsDiv.innerHTML = "<p>Loading recommendations...</p>";

    // Collect answers:
    const answers = {
      vibe: form.elements["vibe"].value,
      storyStyle: form.elements["storyStyle"].value,
      setting: form.elements["setting"].value,
      character: form.elements["character"].value,
      length: form.elements["length"].value,
      complexity: form.elements["complexity"].value,
      humor: form.elements["humor"].value,
      ending: form.elements["ending"].value,
      authors: [...form.elements["authors"]].filter(a => a.checked).map(a => a.value),
      newOrOld: form.elements["newOrOld"].value
    };

    // Map answers to tags
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

    // Remove duplicates & sanitize tags (replace underscores with spaces)
    tags = [...new Set(tags)].map(t => t.replace(/_/g, " "));

    // For length, we treat separately:
    let pageFilter = null;
    if (answers.length === "short") pageFilter = 300;
    else if (answers.length === "medium") pageFilter = 500;

    // For new vs old filtering: filter by publication year
    let yearFilterMin = 0;
    let yearFilterMax = currentYear;
    if (answers.newOrOld === "new") {
      yearFilterMin = currentYear - 1; // last year onwards
    } else if (answers.newOrOld === "old") {
      yearFilterMax = currentYear - 2;
    } // else both = no year filtering

    // Fetch books by tags from Open Library
    // Open Library's Subject API allows searching by a single subject, so pick main tags
    // We'll pick up to 3 tags and get top books for each, then merge and dedupe

    recommendationsDiv.innerHTML = "";

    let allBooks = [];

    // Helper to fetch books from Open Library by subject
    async function fetchBooksBySubject(subject) {
      const url = `https://openlibrary.org/subjects/${encodeURIComponent(subject)}.json?limit=20`;
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("Open Library fetch failed");
        const json = await res.json();
        return json.works || [];
      } catch (e) {
        console.error(e);
        return [];
      }
    }

    // Limit to top 3 tags (most impactful)
    const queryTags = tags.slice(0, 3);

    for (const tag of queryTags) {
      const books = await fetchBooksBySubject(tag);
      allBooks = allBooks.concat(books);
    }

    // Filter duplicates based on OL key
    const uniqueBooksMap = new Map();
    allBooks.forEach(book => {
      if (!uniqueBooksMap.has(book.key)) {
        uniqueBooksMap.set(book.key, book);
      }
    });
    allBooks = Array.from(uniqueBooksMap.values());

    // Filter by page count roughly if available
    if (pageFilter) {
      allBooks = allBooks.filter(b => b.subject ? b.subject.some(s => s.toLowerCase().includes(answers.length)) : true);
      // Note: Open Library API has limited structured page count data — this filter is approximate
    }

    // Filter by publish date if available
    allBooks = allBooks.filter(b => {
      if (!b.first_publish_year) return true;
      return b.first_publish_year >= yearFilterMin && b.first_publish_year <= yearFilterMax;
    });

    // Sort books: prioritize user-preferred authors higher
    if (answers.authors.length > 0) {
      allBooks.sort((a, b) => {
        const aHasAuthor = a.authors && a.authors.some(au => answers.authors.includes(au.name));
        const bHasAuthor = b.authors && b.authors.some(au => answers.authors.includes(au.name));
        if (aHasAuthor && !bHasAuthor) return -1;
        if (!aHasAuthor && bHasAuthor) return 1;
        return 0;
      });
    }

    if (allBooks.length === 0) {
      recommendationsDiv.innerHTML = "<p>No recommendations found based on your preferences. Try adjusting your choices.</p>";
      return;
    }

    // Display books in Netflix-style lanes
    const laneDiv = document.createElement("section");
    laneDiv.className = "lane";
    const laneTitle = document.createElement("h2");
    laneTitle.textContent = `Recommended for you — based on your tastes`;
    laneDiv.appendChild(laneTitle);

    const bookListDiv = document.createElement("div");
    bookListDiv.className = "book-list";

    allBooks.slice(0, 20).forEach(book => {
      const bookDiv = document.createElement("div");
      bookDiv.className = "book";

      // Cover image
      const img = document.createElement("img");
      if (book.cover_id) {
        img.src = `https://covers.openlibrary.org/b/id/${book.cover_id}-M.jpg`;
      } else {
        img.src = "https://via.placeholder.com/120x180?text=No+Cover";
      }
      img.alt = book.title;
      bookDiv.appendChild(img);

      // Title
      const title = document.createElement("div");
      title.className = "book-title";
      title.textContent = book.title;
      bookDiv.appendChild(title);

      // Authors
      const authorDiv = document.createElement("div");
      authorDiv.className = "book-author";
      authorDiv.textContent = (book.authors && book.authors.length) ? book.authors.map(a => a.name).join(", ") : "Unknown author";
      bookDiv.appendChild(authorDiv);

      // Explanation (simple summary why recommended)
      const explanationDiv = document.createElement("div");
      explanationDiv.className = "explanation";
      explanationDiv.textContent = `Because you like ${tags.join(", ")}`;
      bookDiv.appendChild(explanationDiv);

      bookListDiv.appendChild(bookDiv);
    });

    laneDiv.appendChild(bookListDiv);
    recommendationsDiv.appendChild(laneDiv);

  });
});
