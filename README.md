https://yuvajuba.github.io/Typing-test/

## Word lists

Each topic's words live in `words/<topic>.json`, with one list per level:

```json
{
  "easy":   ["cell", "gene", "..."],
  "medium": ["mitochondria", "Darwin", "..."],
  "hard":   ["phosphorylation", "Hardy-Weinberg", "CRISPR", "..."]
}
```

| Level  | Words |
|--------|-------|
| Easy   | lowercase only, 13 characters max |
| Medium | any length, tougher / technical words, mixed with Capitalized ones (names, places, brands like `JavaScript`) |
| Hard   | long and technical: lowercase, Capitalized, UPPERCASE acronyms, mixed-case terms (`mRNA`, `PostgreSQL`) and hyphenated compounds |

Words never contain digits (number keys are ignored while typing) and only use their real spelling: capitals come from the word itself (`iPhone`, `GitHub`), never added at random.

- **Edit a topic:** add or remove words in its JSON file, in the right level.
- **Add a topic:** create `words/<id>.json` with the three lists and add `<option value="<id>">Name</option>` to the topic list in `index.html`.
- **Mixture of all** is built automatically from 10 random words of every topic, at the selected level.

## Scoring

- **Accuracy** = (keystrokes − total errors committed − errors at end) ÷ keystrokes. A mistake you corrected costs 1, a mistake left uncorrected costs 2.
- **Final score (CPM)** = correct characters × accuracy, per minute.
- **Correct words** = words of the text fully typed with every character right.
- **Best scores** are saved per topic and level in the browser's `localStorage` (key `typing-test-best-scores`). The end-of-test box shows the 3 levels of the topic you just played; the **Best scores** button (bottom right) shows every topic.

The lists are loaded with `fetch()`, so run the page through a local server (e.g. VS Code "Live Server" or `npx serve`) rather than opening `index.html` directly from disk.
