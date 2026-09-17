// Simple Book Recommender — using Open Library subject API

const genreMap = {
  science_fiction: "Science Fiction",
  fantasy: "Fantasy",
  mystery: "Mystery",
  romance: "Romance",
  history: "History",
  horror: "Horror"
};

const recommendationsDiv = document.getElementById("recommendations");
const getButton = document.getElementById("get-recommendations");

const userRatings = {}; // Key: book key; Value: 1 (like) or -1 (dislike)

function createBookElement(book, genreName) {
  const div = document.createElement("div");
  div.className = "book";

  // Cover Image
  const img = document.createElement("img");
  if (book.cover_id) {
    img.src = `https://covers.openlibrary.org/b/id/${book.cover_id}-M.jpg`;
  } else {
    img.src = "https://via.placeholder.com/120x180?text=No+Cover";
  }
  img.alt = book.title;
  div.appendChild(img);

  // Title
  const title = document.createElement("div");
  title.className = "book-title";
  title.textContent = book.title;
  div.appendChild(title);

  // Author
  const author = document.createElement("div");
  author.className = "book-author";
  if (book.authors && book.authors.length > 0) {
    author.textContent = book.authors.map(a => a.name).join(", ");
  } else {
    author.textContent = "Unknown author";
  }
  div.appendChild(author);

  // Rating buttons
  const ratingDiv = document.createElement("div");
  ratingDiv.className = "rating-buttons";

  const likeBtn = document.createElement("button");
  likeBtn.textContent = "";
  likeBtn.title = "Like";
  likeBtn.onclick = () => {
    userRatings[book.key] = 1;
    updateExplanation(explanationDiv, genreName, true);
  };

  const dislikeBtn = document.createElement("button");
  dislikeBtn.textContent = "";
  dislikeBtn.title = "Dislike";
  dislikeBtn.onclick = () => {
    userRatings[book.key] = -1;
    updateExplanation(explanationDiv, genreName, false);
  };

  ratingDiv.appendChild(likeBtn);
  ratingDiv.appendChild(dislikeBtn);
  div.appendChild(ratingDiv);

  // Explanation
  const explanationDiv = document.createElement("div");
  explanationDiv.className = "explanation";
  explanationDiv.textContent = `Recommended because you selected "${genreName}"`;
  div.appendChild(explanationDiv);

  return div;
}

function updateExplanation(element, genreName, liked) {
  element.textContent = liked
    ? `Glad you liked this ${genreName} book!`
    : `Thanks for your feedback on this ${genreName} book.`;
}

async function fetchBooksByGenre(genreKey) {
  // Open Library API: https://openlibrary.org/subjects/subject.json
  const url = `https://openlibrary.org/subjects/${genreKey}.json?limit=10`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch");
    const data = await res.json();
    return data.works || [];
  } catch (e) {
    console.error("Error fetching books:", e);
    return [];
  }
}

async function displayRecommendations(selectedGenres) {
  recommendationsDiv.innerHTML = "";

  for (const genreKey of selectedGenres) {
    const laneDiv = document.createElement("section");
    laneDiv.className = "lane";

    const header = document.createElement("h2");
    header.textContent = genreMap[genreKey];
    laneDiv.appendChild(header);

    const bookListDiv = document.createElement("div");
    bookListDiv.className = "book-list";

    const books = await fetchBooksByGenre(genreKey);

    if (books.length === 0) {
      const noBooks = document.createElement("p");
      noBooks.textContent = `No books found for ${genreMap[genreKey]}.`;
      bookListDiv.appendChild(noBooks);
    } else {
      for (const book of books) {
        const bookElement = createBookElement(book, genreMap[genreKey]);
        bookListDiv.appendChild(bookElement);
      }
    }

    laneDiv.appendChild(bookListDiv);
    recommendationsDiv.appendChild(laneDiv);
  }
}

getButton.addEventListener("click", () => {
  const checkboxes = document.querySelectorAll("#genre-selection input[type=checkbox]");
  const selected = [];
  checkboxes.forEach(cb => {
    if (cb.checked) selected.push(cb.value);
  });

  if (selected.length === 0) {
    alert("Please select at least one genre.");
    return;
  }

  displayRecommendations(selected);
});