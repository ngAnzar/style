
use CSSO https://github.com/css/csso

```typescript

const registry = new Registry()

registry.getClass(".not-existing-class") // ->

```

# cache

```json

{
   "width:10px": {
      "a": null,
      "b": ":hover",
      "c": "[color=\"red\"]",
      "d": "[color=\"red\"]:hover",
      "e": "[color=\"red\"][variant=\"filled\"]",
   }
}

[


   { "css": "width:10px", "class": "a", "qualifiers": [] },
   { "css": "width:10px", "class": "b", "qualifiers": ["[color=\"red\"]", ":hover", "[color=\"red\"]:hover"] },
]

```

```css

.nz-button {
   color: black;
}

.nz-button:hover {
   color: red;
}

.nz-button[color="red"] {
   color: red;
}

.nz-button[color="red"]:hover {
   color: black;
}

.nz-alma:hover {
   color: red;
}

.a, .b:hover, .c[color="red"] {
   color: red;
}

.d[color="red"]:hover {
   color: black;
}

/* nz-button -> a b c d   */


.a, .a .nz-button {
   color: red
}

.b[color="red"], .b:hover { color: red }
.c[color="red"][variant="filled"] { color: green }

```

```html

<div class="a b c"></div>

```
