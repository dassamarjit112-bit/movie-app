import { NextRequest, NextResponse } from "next/server";

// Curated list of high-quality fallback movies for when DB is not yet connected
const FALLBACK_MOVIES = [
  {
    id: 1011985,
    title: "Kung Fu Panda 4",
    description:
      "Po is geared up to become the spiritual leader of his Valley of Peace, but needs someone to take his place as the Dragon Warrior.",
    poster: "https://image.tmdb.org/t/p/w500/kDp1vUB3jTL2661QwqjLLnSJjft.jpg",
    release_date: "2024-03-02",
    imdb_id: "tt2161706",
  },
  {
    id: 823464,
    title: "Godzilla x Kong: The New Empire",
    description:
      "Following their explosive showdown, Godzilla and Kong must reunite against a colossal undiscovered threat hidden within our world.",
    poster: "https://image.tmdb.org/t/p/w500/z1pNsZ7OFm14HGPGGFlr6U0K0OI.jpg",
    release_date: "2024-03-27",
    imdb_id: "tt5090568",
  },
  {
    id: 693134,
    title: "Dune: Part Two",
    description:
      "Follow the mythic journey of Paul Atreides as he unites with Chani and the Fremen while on a path of revenge against the conspirators.",
    poster: "https://image.tmdb.org/t/p/w500/1pdfxNCaa1Pv5lh4aVPLGLLJ9bb.jpg",
    release_date: "2024-02-27",
    imdb_id: "tt15239678",
  },
  {
    id: 1022789,
    title: "Inside Out 2",
    description:
      "Teenager Riley's mind headquarters is undergoing a sudden demolition to make room for something entirely unexpected: new Emotions!",
    poster: "https://image.tmdb.org/t/p/w500/vpnVM9B6vFJv5OSmwbvXgzIIDjA.jpg",
    release_date: "2024-06-11",
    imdb_id: "tt22022452",
  },
  {
    id: 519182,
    title: "Despicable Me 4",
    description:
      "Gru and Lucy and their girls welcome a new member to the family, Gru Jr., who is intent on tormenting his dad.",
    poster: "https://image.tmdb.org/t/p/w500/wWba30VFTGNC04WgOmBgX6ST36n.jpg",
    release_date: "2024-06-20",
    imdb_id: "tt7504726",
  },
  {
    id: 929590,
    title: "Civil War",
    description:
      "In a near-future America, a team of military-embedded journalists races to reach Washington, D.C., before rebel factions descend upon the White House.",
    poster: "https://image.tmdb.org/t/p/w500/sh7ZJDj2vcoZuwG55CcIFuV2s57.jpg",
    release_date: "2024-04-10",
    imdb_id: "tt17279496",
  },
  {
    id: 748783,
    title: "The Garfield Movie",
    description:
      "Garfield, the world-famous, Monday-hating, lasagna-loving indoor cat, is about to have a wild outdoor adventure!",
    poster: "https://image.tmdb.org/t/p/w500/0XCKjPHM0MpzasacxPIJaMRb3am.jpg",
    release_date: "2024-05-24",
    imdb_id: "tt5696028",
  },
  {
    id: 573435,
    title: "Bad Boys: Ride or Die",
    description:
      "After their late police captain is framed, Lowrey and Burnett try to clear his name, only to end up on the run themselves.",
    poster: "https://image.tmdb.org/t/p/w500/oGythE98MYleE6mZlTs5G0SKuAB.jpg",
    release_date: "2024-06-07",
    imdb_id: "tt11671006",
  },
  {
    id: 438631,
    title: "Twisters",
    description:
      "Storm chasers encounter multiple interacting tornadoes and struggle to survive while attempting to collect data for scientific research.",
    poster: "https://image.tmdb.org/t/p/w500/pjnD08FlMAIXsfOLKQbIt9sVSiz.jpg",
    release_date: "2024-07-17",
    imdb_id: "tt12584954",
  },
  {
    id: 1022796,
    title: "Alien: Romulus",
    description:
      "A group of young colonists come face-to-face with the most terrifying life form in the universe while scavenging the deep ruins of a derelict space station.",
    poster: "https://image.tmdb.org/t/p/w500/b33nnKl1GSFbao4l3fZDDqsMx0F.jpg",
    release_date: "2024-08-16",
    imdb_id: "tt18412256",
  },
  {
    id: 957452,
    title: "The Substance",
    description:
      "Have you ever dreamed of a better version of yourself? A faded celebrity decides to use a black market drug, a cell-replicating substance that temporarily creates a younger, better version of herself.",
    poster: "https://image.tmdb.org/t/p/w500/lqoMzCcZYEFK729d6qzt349fB4o.jpg",
    release_date: "2024-09-19",
    imdb_id: "tt14858658",
  },
  {
    id: 1116141,
    title: "Terrifier 3",
    description:
      "Art the Clown is back to unleash terror on the unsuspecting residents of Miles County as they peacefully celebrate Christmas.",
    poster: "https://image.tmdb.org/t/p/w500/7XT3EAbshlSnxBjgEHJoqrMKnGg.jpg",
    release_date: "2024-10-09",
    imdb_id: "tt27911000",
  },
];

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("query") || "";

  const dbUrl = process.env.DATABASE_URL;

  // 1. Try PostgreSQL if configured (connection string without placeholder)
  if (dbUrl && !dbUrl.includes("password@localhost")) {
    let client: any = null;
    try {
      // Dynamic import to avoid crash when pg not available
      const { Client } = await import("pg");
      client = new Client({ connectionString: dbUrl });
      await client.connect();

      let result;
      if (query) {
        result = await client.query(
          "SELECT id, title, description, poster, release_date, imdb_id FROM application_movies WHERE title ILIKE $1 ORDER BY release_date DESC LIMIT 50",
          [`%${query}%`]
        );
      } else {
        result = await client.query(
          "SELECT id, title, description, poster, release_date, imdb_id FROM application_movies ORDER BY release_date DESC LIMIT 50"
        );
      }

      await client.end();
      return NextResponse.json(result.rows);
    } catch (err) {
      console.error("PostgreSQL query failed, falling back to mock data:", err);
      if (client) {
        try { await client.end(); } catch (_) {}
      }
    }
  }

  // 2. Fallback: use curated in-memory mock data with optional title filter
  console.log("Serving curated mock data fallback");
  if (query) {
    const q = query.toLowerCase();
    const filtered = FALLBACK_MOVIES.filter((m) =>
      m.title.toLowerCase().includes(q) ||
      m.description.toLowerCase().includes(q)
    );
    return NextResponse.json(filtered);
  }

  return NextResponse.json(FALLBACK_MOVIES);
}