# Layout Reference

> Auto-extracted from live DOM. Use this to understand how the site is structured spatially.

## Spacing System

**Base grid:** 4px

**Scale:** `2, 4, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 44, 64` px

| Spacing | Semantic Use |
|---------|-------------|
| 4px | Tight — within a component |
| 8px | Medium — between sibling items |
| 16px | Wide — between sections |
| 32px | Vast — major section breaks |

## Structural Containers

### `<main>` (`main#main-content._eh`)

```
display:          block
children:         5
```

### `<footer>` (`footer#footer._b0._he`)

```
display:          block
padding:          72px 0px 88px
children:         1
```

## Layout Rules

- Every spacing value must be a multiple of **4px**
- Never use arbitrary margin/padding values outside the spacing scale

