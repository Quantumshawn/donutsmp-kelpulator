# 🌿 DonutSMP Kelp Farm Calculator

A clean, single-page web calculator for optimizing kelp farm profitability on [DonutSMP](https://donutsmp.net).

## 🔗 Live Site

**[kelpulator.vercel.app](https://kelpulator.vercel.app)**

## ✨ Features

- **Live order prices** — fetches current buy order prices from [donut.auction](https://donut.auction) on page load, refreshes every 30 minutes, and caches to localStorage
- **Manual refresh** — refresh button with animated progress bar to force a live price update at any time
- **Optimal ratio calculator** — computes the perfect bone block to blaze rod ratio so no kelp goes unsmelted and no fuel is wasted
- **Shulker counts** — shows how many shulkers of dried kelp blocks you'll produce
- **Revenue & profit** — full breakdown of costs, revenue, and % return on investment
- **Copy buttons** — copy amounts and prices directly (no commas, ready to paste in-game)
- **Manual price override** — toggle on to enter your own prices for more accurate calculations
- **Smart budget input** — supports abbreviations like `100m`, `648k`, `2.45b`
- **Mobile-friendly** — fully responsive layout for phones and tablets

## 🧮 How It Works

### Farm Mechanics
| Step | Conversion |
|------|-----------|
| 1 Bone Block | → 9 Bone Meal |
| 1 Bone Meal | → 1 Kelp (grown) |
| 1 Blaze Rod | → smelts 12 Kelp |
| 9 Dried Kelp | → 1 Dried Kelp Block |

### Optimal Ratio
To ensure no kelp goes unsmelted and no fuel is wasted:

```
9 × (Bone Blocks) = 12 × (Blaze Rods)
→ Bone Blocks / Blaze Rods = 4 / 3
→ B = floor(budget / (bonePrice + 0.75 × blazePrice))
→ R = floor(3 × B / 4)
```

### Pricing
| Item | Price Source |
|------|-------------|
| Bone Blocks | Highest buy order (≥1,000 qty, non-expired) + $6.66 |
| Blaze Rods | Fixed at $156.66 |
| Dried Kelp Blocks | Highest buy order (≥1,000 qty, non-expired) |

## 🚀 Running Locally

No build step or dependencies — just open the file:

```powershell
Start-Process "index.html"
```

Or serve it properly (required for the copy icon to load):

```bash
python -m http.server 8080
```

Then visit [http://localhost:8080](http://localhost:8080).

## 📡 Data Source

Market data from the [donut.auction](https://donut.auction) public API — no authentication required.  
Only orders with ≥1,000 remaining quantity and no expiration are considered, to filter out stale/outlier listings.

## ☕ Support

If this saves you money on DonutSMP, consider [buying Shawn a coffee](https://ko-fi.com/shawnthellama)!

## 📄 License

MIT