# 🌿 DonutSMP Kelp Farm Calculator

A clean, single-page web calculator for optimizing kelp farm profitability on [DonutSMP](https://donutsmp.net).

## 🔗 Live Site
<!-- Update this after deploying -->
> Coming soon

## ✨ Features

- **Live market prices** — automatically fetches current order prices from [donut.auction](https://donut.auction) on page load and refreshes every 30 minutes
- **Optimal ratio calculator** — computes the perfect bone block to blaze rod ratio so no resources are wasted
- **Shulker counts** — shows how many shulkers of each item you need to buy/will produce
- **Revenue & profit** — instant breakdown of costs, revenue, and % return on investment
- **Smart budget input** — supports abbreviations like `100m`, `648k`, `2.45b`

## 🧮 How It Works

### Farm Mechanics
| Step | Conversion |
|------|-----------|
| 1 Bone Block | → 9 Bone Meal |
| 1 Bone Meal | → 1 Kelp (grown) |
| 1 Blaze Rod | → smelts 12 Kelp |
| 9 Dried Kelp | → 1 Dried Kelp Block |

### Optimal Ratio
To ensure no kelp goes unsmelted (and no fuel is wasted):

```
9 × (Bone Blocks) = 12 × (Blaze Rods)
→ Bone Blocks / Blaze Rods = 4 / 3
```

### Pricing
- **Bone Blocks** — highest current order price + $6.66
- **Blaze Rods** — fixed at $156.66
- **Dried Kelp Blocks** — highest current order price (sell price)

## 🚀 Usage

Just open `index.html` in a browser — no build step, no dependencies, no API key required.

Or run locally with:
```bash
python -m http.server 8080
```
Then visit [http://localhost:8080](http://localhost:8080).

## 📡 Data Source

Market data is provided by the [donut.auction Public API](https://donut.auction/api).  
Per their terms of use, attribution is included on the page.

## 📄 License

MIT
