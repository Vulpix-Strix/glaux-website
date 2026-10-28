# Fixture guide

A page with every Markdown feature the Glaux manual may use, with a [link to a page](glaux://api/thing), one [to a heading](glaux://api/thing#parameters), one [to its own heading](#nested-heading), an [external link](https://example.com/docs) and a [mail link](mailto:hi@example.com).

## Lists

- first
- second with `inline code`

1. one
2. two

## Table

| Name  | Meaning     |
|-------|-------------|
| `x`   | Column      |
| `y`   | Row         |

## Code

```luau
local x = 1
print(x)
```

```rhai
let x = 1;
print(x);
```

### Nested heading

> A plain quote.

> [!NOTE]
> A note.

> [!TIP]
> A tip.

> [!IMPORTANT]
> Something important.

> [!WARNING]
> A warning.

> [!CAUTION]
> Be careful.

![Alt text for the logo](https://example.com/logo.png)

![A local dot](../../assets/dot.png)

---

Last paragraph.
