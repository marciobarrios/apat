import type { RecipeData } from "@/lib/recipe";
import { Button } from "./ui/button";

export function RecipeEditor({
  draft,
  setDraft,
  pending,
  importDraft,
  onSave,
  onCancel,
}: {
  draft: RecipeData;
  setDraft: (recipe: RecipeData) => void;
  pending: boolean;
  importDraft?: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <fieldset className="editor paper-sheet" disabled={pending}>
      <h2 id="recipe-title">Review your recipe</h2>
      <p>Keep what the source says. Leave unknown amounts empty.</p>
      <label htmlFor="title">Recipe title</label>
      <input
        id="title"
        value={draft.title}
        onChange={(e) => setDraft({ ...draft, title: e.target.value })}
      />
      <label htmlFor="recipe-language">Recipe language</label>
      <input
        id="recipe-language"
        value={draft.language}
        onChange={(e) => setDraft({ ...draft, language: e.target.value })}
      />
      <label htmlFor="recipe-servings">Servings in source</label>
      <input
        id="recipe-servings"
        type="number"
        min="0.01"
        step="any"
        placeholder="Not stated"
        value={draft.servings ?? ""}
        onChange={(e) =>
          setDraft({
            ...draft,
            servings: e.target.value === "" ? null : Number(e.target.value),
          })
        }
      />
      <label htmlFor="recipe-time">Cooking time in minutes</label>
      <input
        id="recipe-time"
        type="number"
        min="0"
        step="any"
        placeholder="Not stated"
        value={draft.cookMinutes ?? ""}
        onChange={(e) =>
          setDraft({
            ...draft,
            cookMinutes: e.target.value === "" ? null : Number(e.target.value),
          })
        }
      />
      {draft.ingredients.map((item, index) => (
        <div className="ingredient-edit" key={item.id}>
          <label htmlFor={`name-${item.id}`}>Ingredient {index + 1}</label>
          <input
            id={`name-${item.id}`}
            value={item.name}
            onChange={(e) =>
              setDraft({
                ...draft,
                ingredients: draft.ingredients.map((i, n) =>
                  n === index ? { ...i, name: e.target.value } : i,
                ),
              })
            }
          />
          <label htmlFor={`quantity-${item.id}`}>
            Quantity for {item.name || `ingredient ${index + 1}`}
          </label>
          <input
            id={`quantity-${item.id}`}
            type="number"
            min="0"
            step="any"
            value={item.quantity ?? ""}
            placeholder="Not stated"
            onChange={(e) =>
              setDraft({
                ...draft,
                ingredients: draft.ingredients.map((i, n) =>
                  n === index
                    ? {
                        ...i,
                        quantity: e.target.value === "" ? null : Number(e.target.value),
                      }
                    : i,
                ),
              })
            }
          />
          <small>Original: {item.original}</small>
          <label htmlFor={`unit-${item.id}`}>
            Unit for {item.name || `ingredient ${index + 1}`}
          </label>
          <input
            id={`unit-${item.id}`}
            value={item.unit ?? ""}
            onChange={(e) =>
              setDraft({
                ...draft,
                ingredients: draft.ingredients.map((value, n) =>
                  n === index ? { ...value, unit: e.target.value || null } : value,
                ),
              })
            }
          />
          <label htmlFor={`max-${item.id}`}>
            Upper quantity for {item.name || `ingredient ${index + 1}`}
          </label>
          <input
            id={`max-${item.id}`}
            type="number"
            min="0"
            step="any"
            placeholder="No range"
            value={item.quantityMax ?? ""}
            onChange={(e) =>
              setDraft({
                ...draft,
                ingredients: draft.ingredients.map((value, n) =>
                  n === index
                    ? {
                        ...value,
                        quantityMax: e.target.value === "" ? null : Number(e.target.value),
                      }
                    : value,
                ),
              })
            }
          />
          <Button
            variant="outline"
            onClick={() =>
              setDraft({ ...draft, ingredients: draft.ingredients.filter((_, n) => n !== index) })
            }
          >
            Remove ingredient {index + 1}
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        disabled={draft.ingredients.length >= 100}
        onClick={() =>
          setDraft({
            ...draft,
            ingredients: [
              ...draft.ingredients,
              {
                id: crypto.randomUUID(),
                name: "",
                original: "",
                quantity: null,
                quantityMax: null,
                unit: null,
                evidence: { kind: "user", excerpt: "", timestampSeconds: null },
              },
            ],
          })
        }
      >
        Add ingredient
      </Button>
      {draft.steps.map((step, index) => (
        <div key={step.id}>
          <label htmlFor={`step-${step.id}`}>Step {index + 1}</label>
          <textarea
            id={`step-${step.id}`}
            value={step.text}
            onChange={(e) =>
              setDraft({
                ...draft,
                steps: draft.steps.map((s, n) =>
                  n === index ? { ...s, text: e.target.value } : s,
                ),
              })
            }
          />
          <Button
            variant="outline"
            onClick={() => setDraft({ ...draft, steps: draft.steps.filter((_, n) => n !== index) })}
          >
            Remove step {index + 1}
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        disabled={draft.steps.length >= 100}
        onClick={() =>
          setDraft({
            ...draft,
            steps: [
              ...draft.steps,
              {
                id: crypto.randomUUID(),
                text: "",
                evidence: { kind: "user", excerpt: "", timestampSeconds: null },
              },
            ],
          })
        }
      >
        Add step
      </Button>
      <div className="actions">
        <Button disabled={pending} onClick={onSave}>
          {pending ? "Saving…" : importDraft ? "Save to notebook" : "Save changes"}
        </Button>
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => {
            onCancel();
          }}
        >
          Cancel editing
        </Button>
      </div>
    </fieldset>
  );
}
