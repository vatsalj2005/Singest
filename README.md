# Singest — Indian Equity Markets Dashboard

Welcome to the documentation for **Singest**, a simple, high-performance website for checking and screening stocks in the Indian stock market (NSE and BSE).

This guide is written in **simple, plain English** to explain what technologies are used, how the system's architecture and api calls are structured, how the core algorithms work, and what every single file and function in this project does.

---

## 1. What is Singest & Why is it Needed?

Singest is a dashboard that helps regular people check the health of different public companies (like Reliance, TCS, or Infosys) listed on the stock market.

It does three main things:

1. **Dashboard (Home Page)**: Gives you a quick look at the market. It shows today's **Top Gainer** (the stock that went up the most in price today), **Top Loser** (the stock that went down the most today), a list of **Popular Stocks**, and the latest financial **News**.
2. **Screener Page**: A tool to filter and search through hundreds of stocks at once. For example, you can use it to find only "Large companies that have low debt and high profits."
3. **Stock Details Page**: A detailed profile page for any specific company. It shows how the stock price has performed over time, key financial stats (like profits and earnings), technical charts, and corporate actions (like cash dividend payouts).

---

## 2. What Singest is Made Using (The Tech Stack)

Here is a list of the core tools and technologies used to build this website:

- **Next.js 15 (App Router)**: The main website engine. It manages routes (web links) and lets us write server code (which talks directly to the database) and browser code (which creates interactive pages) in the same project.
- **React 19**: A framework for building the user interface. It lets us create reusable blocks (components) like buttons, tables, and charts that update automatically when data changes.
- **CockroachDB / PostgreSQL**: The database where all our stock information is stored. We connect to it using the standard `pg` (node-postgres) client library.
- **Tailwind CSS**: A styling tool that lets us write design rules directly inside our page files, making it easy to create beautiful layouts and dark/light modes.
- **Recharts**: A library used to draw charts, such as the bar chart of annual dividend payments and the vertical stock price performance chart.
- **Lucide React**: A collection of clean, modern icons (like arrows, wallets, and search magnifying glasses) used throughout the dashboard.

---

## 3. The Stock Screener Page (In Simple Terms)

### What is it?

Imagine going to a giant market with 5,000 different boxes of fruit. Checking every single box one by one to find the freshest, cheapest fruit is impossible.
The **Stock Screener** is like a magic sieve or filter. You tell it exactly what you want—for example, "show me only large sweet apples that cost less than ₹20"—and it instantly filters out everything else, leaving you with a clean, short list.

### Why is it needed?

There are thousands of companies listed on the stock exchange. A normal person cannot check each one individually. The Screener is needed to instantly filter out bad or irrelevant stocks, saving you hours of time and leaving you with a short list of high-quality companies to study.

### How does it work?

1. On the screen, you slide filter controls or check boxes (like setting a minimum Return on Equity percentage or choosing "Large Cap" size).
2. When you click **Apply Filters**, the website sends these choices to the server.
3. The server builds a database search request (a SQL query) that asks the database to find only the rows that match all your chosen rules.
4. The database replies with the matching stocks, and the website shows them in a clean, scrollable table.

### Where does the data come from?

The Screener page reads directly from a table called **`custom_scan`** inside our database. Every time you change filters or click a table header to sort the list (e.g., sort by highest dividend first), the database is asked to scan this table and return the sorted results.

---

## 4. Glossary of Terms (What They Mean & Where They Come From)

Here is a guide explaining every technical and financial term used on the stock pages and screener, why they matter, and the exact database table column they read from.

### 4.1 Basic Stock Price Metrics

These metrics tell you how much a share costs and how much it is moving today. All of these points come from the **`custom_scan`** table in our database.

| Term                                                     | What it means in simple terms                                                                      | Why it is useful                                                                                                                       | Database Column                                           |
| :------------------------------------------------------- | :------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------- |
| **LTP (Last Traded Price) / CMP (Current Market Price)** | The most recent price that someone paid for one share of this stock.                               | Tells you exactly how much it costs to buy a single share right now.                                                                   | `ltp`                                                     |
| **Change %**                                             | How much the stock price has gone up or down today compared to when the market closed yesterday.   | Tells you if the stock is having a green (going up) day or a red (going down) day.                                                     | `pperchange`                                              |
| **Volume**                                               | The total number of shares bought and sold by traders today.                                       | High volume means a lot of people are actively trading this stock right now.                                                           | `volume`                                                  |
| **Open**                                                 | The price of the stock when the market opened for trading this morning.                            | Tells you how the stock started its day.                                                                                               | `open`                                                    |
| **Prev Close**                                           | The final price of the stock when the market closed yesterday.                                     | Serves as the baseline to calculate today's price change.                                                                              | `bc_close`                                                |
| **High / Low (1W, 1Y, 3Y, 5Y)**                          | The highest and lowest prices the stock has reached over these different time periods.             | Helps you see if the current price is close to its historical peaks or its lowest point.                                               | `high_1wk`, `high_1yr`, `low_1yr`, `high_3yr`, `high_5yr` |
| **Away from 5Y High**                                    | How far the current stock price is below its highest point from the last 5 years, as a percentage. | Tells you how much the stock has fallen from its peak value. A higher negative percentage means it is much cheaper than it used to be. | `rt_away_from_5_year_high`                                |

---

### 4.2 Valuation Metrics (Is the stock cheap or expensive?)

These metrics help you see if a stock's price makes sense compared to the company's real profits. All of these points come from the **`custom_scan`** table.

| Term                                   | What it means in simple terms                                                                                                                   | Why it is useful                                                                                                                                                           | Database Column                                    |
| :------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------- |
| **Market Cap (Market Capitalization)** | The total value of the entire company if you bought every single share. Calculated as: `Total Shares × Current Share Price`.                    | Tells you how big the company is. Big companies are "Large Cap" (safe but grow slow), medium ones are "Mid Cap", and small ones are "Small Cap" (risky but can grow fast). | `mcap` (Rupees value), `mcapclass` (Size category) |
| **P/E Ratio (Price-to-Earnings)**      | Compares the share price to the company's profit per share. If P/E is 15, it means you are paying ₹15 for every ₹1 of profit the company makes. | Helps you see if the stock is overpriced or bargain-priced compared to its actual earnings.                                                                                | `pe`                                               |
| **P/B Ratio (Price-to-Book)**          | Compares the stock price to the value of the company's physical assets (like buildings, land, and cash) if it were shut down and sold today.    | Useful for checking if the stock price is backed by real, physical assets.                                                                                                 | `pb`                                               |
| **EPS (Earnings Per Share)**           | The total profit of the company divided by the number of shares. It is the portion of profit allocated to each individual share.                | Tells you how much money a single share is actually earning for you.                                                                                                       | `eps`                                              |
| **Industry P/E**                       | The average P/E ratio of all other companies in the same business sector.                                                                       | Helps you compare. If a stock's P/E is 10 but its Industry P/E is 30, the stock might be relatively cheap compared to its competitors.                                     | `ind_pe`                                           |
| **Dividend Yield**                     | The percentage of the stock price that the company pays back to you in cash dividends each year.                                                | If the yield is 3% and you invest ₹100, the company pays you ₹3 in cash annually just for holding the stock.                                                               | `div_yeild`                                        |

---

### 4.3 Efficiency & Growth Metrics (How healthy is the business?)

These show how well the company's managers run the business and grow its sales. All of these points come from the **`custom_scan`** table.

| Term                                               | What it means in simple terms                                                                                             | Why it is useful                                                                                             | Database Column                                                                                                                                               |
| :------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------ | :----------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **ROE (Return on Equity)**                         | How much profit the company generates using the money invested by its owners (shareholders).                              | Tells you how efficiently the company uses your invested capital to make more money.                         | `roe`                                                                                                                                                         |
| **ROCE (Return on Capital Employed)**              | Similar to ROE, but also includes borrowed money (debt).                                                                  | Shows how profitable the company is, taking all its funding sources (investments + bank loans) into account. | `roce`                                                                                                                                                        |
| **EBITDA Margin**                                  | Profit percentage before subtracting interest on loans, taxes, and wear-and-tear of equipment (depreciation).             | Tells you how profitable the core day-to-day operations are, before bills and taxes get in the way.          | `ebidta_margin`                                                                                                                                               |
| **Net Profit Margin**                              | The actual percentage of sales (revenue) left over as pure profit after paying absolutely all expenses, taxes, and bills. | A high margin (e.g. 20%) means the business is highly profitable and keeps costs low.                        | `net_profit_margin`                                                                                                                                           |
| **Revenue**                                        | The total amount of money the company brings in from selling its products or services, before subtracting any costs.      | Tells you the scale of the business (total sales).                                                           | `revenue`                                                                                                                                                     |
| **Revenue Growth (1Y)**                            | How much the company's total sales grew over the last 1 year, as a percentage.                                            | Tells you if the company is selling more stuff and expanding its market footprint.                           | `year_1_revenue_growth`                                                                                                                                       |
| **QoQ Profit Growth**                              | How much the company's profit in the most recent quarter grew compared to the exact same quarter last year.               | Helps you see if profits are actively accelerating right now.                                                | `yoy_last_qtrly_profit_growth`                                                                                                                                |
| **EPS Growth (1Y CAGR)**                           | The average yearly growth rate of earnings per share over a year.                                                         | Tells you if the profit per share is compounding at a healthy rate.                                          | `year_1_cagr_eps_growth`                                                                                                                                      |
| **Free Cash Flow**                                 | The actual cash a company has leftover after paying for its day-to-day operations and buying any physical equipment.      | This is the "free cash" the company can spend on dividends, buying back shares, or paying off debt.          | `free_cash_flow`                                                                                                                                              |
| **OCF Growth**                                     | The growth rate of the cash generated from the company's main operations.                                                 | Verifies if the cash flows are growing in line with the reported accounting profits.                         | `ocf_growth_on_yr`                                                                                                                                            |
| **Price Performance (1W, 2W, 1M, 3M, 1Y, 3Y, 5Y)** | The percentage return of the stock price over these different historical time periods.                                    | Helps you see if the stock price has been rising or falling recently.                                        | `price_perchng_1week`, `price_perchng_2week`, `price_perchng_1mon`, `price_perchng_3mon`, `price_perchng_1year`, `price_perchng_3year`, `price_perchng_5year` |

---

### 4.4 Technical Indicators (Is it a good time to buy?)

These metrics look at price patterns to help time your purchase. All of these points come from the **`custom_scan`** table.

| Term                                       | What it means in simple terms                                                                                                                                                                                                                     | Why it is useful                                                                                                                 | Database Column                                           |
| :----------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------- |
| **RSI (Relative Strength Index)**          | A speedo-style score from 0 to 100 based on price movement speed. If it is **above 70**, the stock is "Overbought" (bought too fast, and price might fall soon). If it is **below 30**, it is "Oversold" (sold too fast, and might be a bargain). | Helps you avoid buying stocks at temporary price peaks.                                                                          | `day_rsi_14_current_candle`                               |
| **SMA (Simple Moving Average - 50 / 200)** | The average price of the stock over the last 50 or 200 days.                                                                                                                                                                                      | If the current price is _above_ the average, the stock is in an uptrend (strong). If it is _below_, it is in a downtrend (weak). | `day_sma_50_current_candle`, `day_sma_200_current_candle` |
| **Bollinger Width**                        | A metric that measures how wide the stock price swings are.                                                                                                                                                                                       | A higher width means the stock price jumps around wildly (highly volatile). A lower width means the price is stable.             | `day_bb_upper_sub_bb_lower`                               |
| **ATR (14) × 2**                           | Average True Range multiplied by two. Measures how much the stock price typically swings up and down on a normal day.                                                                                                                             | Helps you understand daily price risk. High ATR means the price fluctuates a lot each day.                                       | `day_atr_14_current_candle_mul_2`                         |

---

### 4.5 Peer Comparison

- **What is it?** A comparison table that shows how the selected company stacks up against its direct competitors of similar size (e.g., comparing a Large Cap stock against other Large Cap stocks).
- **Why is it needed?** It is like comparing prices and ratings of similar products online. It helps you see if this stock is cheaper, more profitable, or faster-growing than other similar options.
- **Where does the data come from?** The website looks at the current stock's `mcapclass` (e.g. Large Cap) in the database, and then searches the **`custom_scan`** table to load up to 10 other stocks that share the same `mcapclass`.

---

### 4.6 Corporate Actions

- **What is it?** A record of corporate events. A company does these actions when it wants to distribute profits, change its share structure, or update the public.
- **Why is it needed?** To keep track of payouts and changes to your shares. For example, knowing when a company pays a dividend or splits its shares affects how much cash or how many shares you hold.
- **Where does it come from?** The website queries six separate tables in the database using the stock's unique **`isin`** code:

1.  **Dividends** (Cash payouts back to investors): Reads from `corporate_actions_dividends` table.
2.  **Bonus** (Free extra shares given to you): Reads from `corporate_actions_bonus` table.
3.  **Splits** (Splitting 1 share into multiple shares to lower the price): Reads from `corporate_actions_splits` table.
4.  **Rights** (Letting existing holders buy more shares at a discount): Reads from `corporate_actions_rights` table.
5.  **Buybacks** (The company buying back its own shares to increase value): Reads from `corporate_actions_buybacks` table.
6.  **Quarterly Results** (Regular profit reports): Reads from `corporate_actions_quarterly_results` table.

---

### 4.7 Live News

- **What is it?** A list of the latest news stories about the selected company.
- **Why is it needed?** To see if there is any positive or negative news that might cause the stock price to rise or fall.
- **Where does it come from?** Reads from the **`live_news`** table in our database. It matches the news records with the stock by comparing the `isin_code` column, and displays up to 10 of the most recent articles.

---

## 5. How the System Works (Core Algorithms & Workflows)

Here are the key algorithms and workflows used on this website, explained in simple terms:

### 5.1 Dynamic Query Builder (The Stock Screener Filter)

When you apply filters on the Screener Page (like setting P/E to be between 10 and 20), the website does not download all stocks and filter them in your browser. Instead, it builds a SQL query dynamically.

- **Algorithm**:
  1. It starts with a base query: `SELECT * FROM custom_scan WHERE 1=1`.
  2. It checks which filters you have set. For each active filter, it appends a condition (e.g., `AND pe >= $1` and `AND pe <= $2`).
  3. The query utilizes placeholder parameters (`$1`, `$2`) instead of inserting numbers directly. This acts as a security shield (preventing SQL Injection).
  4. It appends the sort rules (e.g., `ORDER BY mcap DESC`) and pagination limits (e.g., `LIMIT 50 OFFSET 0` for page 1) to fetch only the needed page.

### 5.2 Autocomplete Search & Debouncing

As you type in the search bar, the search box shows suggestions.

- **Debouncing Algorithm**: To prevent sending a request on every single letter you type (which would slow down the database), the search bar uses a timer. When you type a letter, it waits for `300 milliseconds` of silence. If you type another letter before the timer ends, it resets the timer. It only sends the API request when you stop typing.
- **Discard Out-of-Order Responses**: If you type fast and multiple requests are sent, they might return in the wrong order. The component tracks whether a request is still relevant using a local active boolean flag, discarding any results that belong to older search terms.

### 5.3 Semicircle Needle Math (The RSI Gauge)

The Relative Strength Index (RSI) is shown on a speedometer-style gauge. Since the gauge is a custom SVG semicircle, we have to calculate the coordinate points where the needle should point.

- **Algorithm**:
  1. The RSI value ranges from 0 to 100.
  2. We convert this range to a semicircle angle (0 to 180 degrees).
  3. The angle is calculated as `angle = 180 - (rsi_value / 100) * 180`.
  4. We convert this degree angle to radians using `radians = (angle * Math.PI) / 180`.
  5. Using trigonometry, we calculate the ending X and Y coordinate coordinates of the needle line:
     - `X = Center_X + Radius * Math.cos(radians)`
     - `Y = Center_Y - Radius * Math.sin(radians)`
  6. The SVG draws a line from the center `(80, 80)` to `(X, Y)`.

### 5.4 Theme Flashing Prevention

Normally, when a page loads, there can be a brief "flash" of bright white before the theme styles load.

- **Algorithm**: In the `layout.tsx` file, we place an inline script `<script>` at the very top of the HTML header. This script runs instantly _before_ any CSS or visual components are drawn on screen. It reads `localStorage` for the theme setting and immediately adds or removes the `.dark` class from the `<html>` tag.

### 5.5 Parallel Counts Gathering (Corporate Actions)

When viewing a stock, we display how many items exist in each corporate action tab (e.g., "Dividends (15)", "Splits (2)").

- **Algorithm**: Querying 6 database tables one after another would make the page load slowly. The API handler launches all 6 count queries in parallel using `Promise.all()`. The server fires all queries at the database at the same instant and waits for all of them to return before sending a single grouped response back to the client.

---

## 6. Architecture & Client-Server Data Flow

This website follows the **Next.js App Router Architecture**:

1.  **Browser (Client Side)**: The user interacts with the UI. Components manage their own state (using React's `useState`).
2.  **API Requests (Data Fetching)**: Client components use `fetch` to ask for data from our API route handlers (under `/src/app/api`).
3.  **Database Connection (Server Side)**: The API route handlers run on the server. They connect securely to CockroachDB using a connection pool, retrieve database rows, and send them back to the client in JSON format.
4.  **Security**: The database credentials are kept safe on the server (using `.env` variables) and are never exposed to the user's browser.

### 6.1 List of API Route Handlers

- **`/api/market-overview`**:
  - **Method**: `GET`
  - **What it does**: Queries the database to find today's top gainer, top loser, and a hardcoded list of popular stocks.
  - **Table queried**: `custom_scan`
- **`/api/news`**:
  - **Method**: `GET`
  - **What it does**: Queries the database for the 10 most recent news articles.
  - **Table queried**: `live_news`
- **`/api/search?q=[term]`**:
  - **Method**: `GET`
  - **What it does**: Takes a query string and returns matching symbols or names for autocomplete.
  - **Table queried**: `custom_scan`
- **`/api/screener`**:
  - **Method**: `GET` (Accepts filters like `pe_min`, `roce_min`, `sort`, `page`, `limit` as URL parameters)
  - **What it does**: Returns a filtered, sorted, and paginated list of stocks.
  - **Table queried**: `custom_scan`
- **`/api/screener/facets`**:
  - **Method**: `GET`
  - **What it does**: Returns the available market cap classes and total count of stocks.
  - **Table queried**: `custom_scan`
- **`/api/stock/[isin]`**:
  - **Method**: `GET`
  - **What it does**: Returns the complete record of a single stock, plus its recent news articles.
  - **Tables queried**: `custom_scan`, `live_news`
- **`/api/stock/[isin]/peers`**:
  - **Method**: `GET`
  - **What it does**: Returns up to 10 other stocks that share the same market capitalization class.
  - **Table queried**: `custom_scan`
- **`/api/stock/[isin]/corporate-counts`**:
  - **Method**: `GET`
  - **What it does**: Returns counts of corporate actions across all categories.
  - **Tables queried**: `corporate_actions_dividends`, `corporate_actions_bonus`, `corporate_actions_splits`, `corporate_actions_rights`, `corporate_actions_buybacks`, `corporate_actions_quarterly_results`
- **`/api/stock/[isin]/[action]`**:
  - **Method**: `GET` (Where `[action]` is `dividends`, `splits`, `bonus`, etc.)
  - **What it does**: Returns all corporate action logs of that specific type for the stock.
  - **Tables queried**: The matching corporate action table.

---

## 7. File & Function Guide (Every File & Function Explained)

Here is the complete list of files in the Singest project, detailing the name and purpose of every function and component in simple terms:

### 7.1 Configuration Files

- [`package.json`](file:///e:/Signalz/Singest/package.json): Lists the commands we can run (like starting the site or building it) and defines the packages used.
- [`next.config.ts`](file:///e:/Signalz/Singest/next.config.ts): Configures Next.js parameters, such as enabling TypeScript checking during compilation.
- [`postcss.config.mjs`](file:///e:/Signalz/Singest/postcss.config.mjs): Configuration for the Tailwind CSS style parser.
- [`tsconfig.json`](file:///e:/Signalz/Singest/tsconfig.json): Rules for the TypeScript compiler (ensuring we don't make typing mistakes).
- [`eslint.config.js`](file:///e:/Signalz/Singest/eslint.config.js): Defines rules to scan our code for bugs, warnings, and formatting issues.
- [`.prettierrc`](file:///e:/Signalz/Singest/.prettierrc): Settings that specify indentation and spacing rules to keep code neat.
- [`.gitignore`](file:///e:/Signalz/Singest/.gitignore): Specifies which temporary folders and database configuration files should not be uploaded to GitHub.
- [`.env.example`](file:///e:/Signalz/Singest/.env.example): A template showing the configuration keys needed to run the website.
- [`next-env.d.ts`](file:///e:/Signalz/Singest/next-env.d.ts): Auto-generated file to help code editors recognize Next.js page variables.

### 7.2 Styling Files

- [`src/custom.d.ts`](file:///e:/Signalz/Singest/src/custom.d.ts): Lets the build system import stylesheet files directly.
- [`src/styles.css`](file:///e:/Signalz/Singest/src/styles.css): The central stylesheet containing Tailwind CSS tokens, theme variables for light and dark modes, and CSS class rules for cards and background gradients.

### 7.3 Data & Connection Helpers (`src/lib/`)

- [`src/lib/db.server.ts`](file:///e:/Signalz/Singest/src/lib/db.server.ts):
  - **`getPool()`**: Creates or returns a single, shared connection pool to our database so the website does not overload the database with duplicate connection pipes.
  - **`query(text, params)`**: Takes a SQL query string and parameter values, runs it through the database pool, and returns the resulting records.
- [`src/lib/format.ts`](file:///e:/Signalz/Singest/src/lib/format.ts):
  - Contains shared and standardized helper functions for formatting prices, percentages, market cap badges, integers, decimals, and relative timestamps (e.g., `fmtPrice()`, `fmtPct()`, `mcapBadge()`, `timeAgo()`).
- [`src/lib/types.ts`](file:///e:/Signalz/Singest/src/lib/types.ts):
  - Defines the core type interfaces for stock overview summaries, detailed screener table rows, news feed articles, news headlines, and corporate action tab categories.
- [`src/lib/corporate-tables.ts`](file:///e:/Signalz/Singest/src/lib/corporate-tables.ts):
  - Maps corporate action types (dividends, splits, quarterly results, etc.) to database table names.

### 7.4 UI Components (`src/components/`)

- [`src/components/ThemeToggle.tsx`](file:///e:/Signalz/Singest/src/components/ThemeToggle.tsx):
  - **`ThemeToggle()`**: Renders a button that lets the user switch between Dark and Light mode. It toggles the `.dark` class on the page wrapper and saves the user's choice in browser storage.
- [`src/components/CorporateActions.tsx`](file:///e:/Signalz/Singest/src/components/CorporateActions.tsx):
  - **`CorporateActions({ isin })`**: The main container component that draws the corporate actions area, coordinates the tabs, and fetches summary totals.
  - **`TabPanel({ tab, isin })`**: Renders the detail cards or tables for the selected tab (e.g. "Dividends").
  - **`DividendChart({ rows })`**: Renders a bar chart showing the historical cash dividend amounts over time.
  - **`fmtDate(v)`**: Formats raw dates into a readable date string (e.g. `22 Jun 2026`).
  - **`isFuture(v)`**: Checks if a date is in the future.
  - **`fmtPrice(v)`**: Formats a raw number into Indian currency style (e.g. `₹150.50`).
  - **`fmtText(v)`**: Safely prints text or a placeholder dash if empty.
  - **`truncate(s, n)`**: Truncates long strings to fit inside tables.
- [`src/components/PeerComparison.tsx`](file:///e:/Signalz/Singest/src/components/PeerComparison.tsx):
  - **`PeerComparison({ isin })`**: Loads and displays a comparison grid showing metrics for the current company alongside its closest competitors.
  - **`num(v)`**: Sanitizes input value into a number or returns null.
  - **`fmt(v, digits)`**: Formats numerical decimals with commas.
  - **`fmtPrice(v)`**: Formats numerical value as Rupee text.
  - **`fmtCr(v)`**: Formats large company valuations in Crores (₹10,000,000).
  - **`fmtPct(v)`**: Formats a decimal as a percentage with a positive `+` or negative `-` sign.
  - **`pctClass(v)`**: Returns color classes (green for positive, red for negative, grey for zero) to style return percentages.

### 7.5 Routing & App Pages (`src/app/`)

- [`src/app/layout.tsx`](file:///e:/Signalz/Singest/src/app/layout.tsx):
  - **`RootLayout({ children })`**: The layout shell that provides the page header, logo link, and light/dark theme initializer.
- [`src/app/error.tsx`](file:///e:/Signalz/Singest/src/app/error.tsx):
  - **`ErrorPage({ error, reset })`**: An error screen that handles any crashes and provides a retry mechanism.
- [`src/app/not-found.tsx`](file:///e:/Signalz/Singest/src/app/not-found.tsx):
  - **`NotFound()`**: Standard 404 message page when a link is invalid.
- [`src/app/page.tsx` (Dashboard Homepage)](file:///e:/Signalz/Singest/src/app/page.tsx):
  - **`Dashboard()`**: Renders today's gainers/losers list, popular stocks grid, search, and news updates.
  - **`StockSearch()`**: Configures the search field, handles keyboard inputs, and controls the debounced suggestions dropdown.
- [`src/app/screener/page.tsx` (Stock Screener)](file:///e:/Signalz/Singest/src/app/screener/page.tsx):
  - **`ScreenerPage()`**: Handles the stock screener page logic, filter updates, pagination buttons, and sorting table headers.
  - **`toggleClass(c)`**: Adds or removes a market cap class filter from the selected choices list.
  - **`reset()`**: Resets all search sliders and check boxes back to empty.
- [`src/app/stock/[isin]/page.tsx`](file:///e:/Signalz/Singest/src/app/stock/[isin]/page.tsx):
  - **`generateMetadata({ params })`**: Fetches the company display name from the database server-side to set the browser title dynamically.
  - **`StockPage({ params })`**: Fetches the initial stock data and news on the server-side, preparing the page instantly before loading client components.
- [`src/app/stock/[isin]/StockPageClient.tsx`](file:///e:/Signalz/Singest/src/app/stock/[isin]/StockPageClient.tsx):
  - **`StockPageClient({ stock, news })`**: Handles the layout grid of key metrics cards, price return charts, indicators, and recent news list.
  - **`IndicatorCard({ label, value, icon })`**: A card component to display details like Bollinger Width.
  - **`SmaCard({ label, sma, ltp })`**: A card component comparing the current price against a Simple Moving Average.
  - **`RsiGauge({ value })`**: Renders a speedometer-style arc with an SVG needle mapped to the RSI score.
  - **`sentimentColor(s)`**: Helper function to determine visual style classes for news sentiment badges.

### 7.6 Server API Routes (`src/app/api/`)

- [`src/app/api/market-overview/route.ts`](file:///e:/Signalz/Singest/src/app/api/market-overview/route.ts):
  - **`GET()`**: Server function that queries the stock with the largest positive return (Gainer) and largest negative return (Loser) from `custom_scan`, plus 5 popular stocks.
- [`src/app/api/news/route.ts`](file:///e:/Signalz/Singest/src/app/api/news/route.ts):
  - **`GET()`**: Server function that returns the 10 most recent news articles sorted by publish date from the `live_news` table.
- [`src/app/api/search/route.ts`](file:///e:/Signalz/Singest/src/app/api/search/route.ts):
  - **`GET(request)`**: Server function that parses the autocomplete text query, searches the ticker or display symbol in `custom_scan` using a wildcard match, and returns the matches.
- [`src/app/api/screener/route.ts`](file:///e:/Signalz/Singest/src/app/api/screener/route.ts):
  - **`GET(request)`**: Server function that dynamically reads filters from the client's URL parameters, constructs a parameterized SQL query against `custom_scan`, and returns the matching stock list.
- [`src/app/api/screener/facets/route.ts`](file:///e:/Signalz/Singest/src/app/api/screener/facets/route.ts):
  - **`GET()`**: Server function that gathers metadata, including distinct cap classes and the total number of stocks.
- [`src/app/api/stock/[isin]/route.ts`](file:///e:/Signalz/Singest/src/app/api/stock/[isin]/route.ts):
  - **`GET(request, { params })`**: Server function that returns details for a single stock and its recent news using the ISIN code.
- [`src/app/api/stock/[isin]/peers/route.ts`](file:///e:/Signalz/Singest/src/app/api/stock/[isin]/peers/route.ts):
  - **`GET(request, { params })`**: Server function that looks up other stocks in the same market cap size class (`mcapclass`) to return peer stocks.
- [`src/app/api/stock/[isin]/corporate-counts/route.ts`](file:///e:/Signalz/Singest/src/app/api/stock/[isin]/corporate-counts/route.ts):
  - **`GET(request, { params })`**: Server function that executes 6 parallel queries to count rows matching the stock's ISIN in our corporate action tables.
- [`src/app/api/stock/[isin]/[action]/route.ts`](file:///e:/Signalz/Singest/src/app/api/stock/[isin]/[action]/route.ts):
  - **`GET(request, { params })`**: Server function that queries corporate events from the mapped table for the specified action (dividends, splits, etc.) and returns them sorted by ex-date.

---

## 8. How to Run the Website (Commands)

You can run these commands in your terminal to start, format, check, or build the website:

```bash
# 1. Install all dependencies
npm install

# 2. Start the site in development mode (view on http://localhost:3000)
npm run dev

# 3. Clean and auto-format spacing in the code
npm run format

# 4. Check for code syntax errors
npm run lint

# 5. Compile the website into an optimized package for hosting
npm run build

# 6. Start the compiled production package
npm run start
```

---

## 9. The Ingestion Backend (Python Data Sync)

The `Backend/` folder contains a set of Python ingestion scripts that fetch corporate actions, live news, and technical scan metrics from the Dhan API and load them into CockroachDB. This runs in the background (manually or as a scheduled task) to populate the database so that the website doesn't hit API limits.

### 9.1 Environment & Setup

The Python backend scripts are configured to read the database details from **either** the local `Backend/.env` file or the Next.js parent root folder's `.env` file. You only need to configure `.env` once at the root directory of Singest.

To install dependencies:

```bash
# Go to the Backend folder
cd Backend

# Install python packages
pip install -r requirements.txt
```

### 9.2 Running the Pipeline

You can run all ingestion scripts sequentially or individually from the root folder or the `Backend/` directory:

```bash
# Run the combined pipeline (Corporate Actions -> Live News -> Custom Scan)
python Backend/main.py

# Run individual scripts
python Backend/scripts/ingest_corporate_actions.py
python Backend/scripts/ingest_live_news.py
python Backend/scripts/ingest_custom_scan.py
```

### 9.3 Ingestion Files & Functions Guide

#### 9.3.1 Orchestration Core (`Backend/main.py`)

- **`update_last_run_date(script_name, run_date)`**: Updates the database metadata table (`ingestion_metadata`) with the date after a successful run.
- **`run_script(script_path)`**: Executes a python script in a background subprocess, streaming standard output/error to the terminal.
- **`main()`**: Runs all scripts in sequence and prints a summary.

#### 9.3.2 Corporate Actions Ingestion (`Backend/scripts/ingest_corporate_actions.py`)

- **`calculate_row_hash(record, act_type)`**: Calculates a SHA-256 hash using the fields `["isin", "ann_date", "ann_ltp", "ex_date"]` to identify unique actions.
- **`load_existing_hashes(conn, table_name)`**: Loads all hashes already present in a table.
- **`init_tables()`**: Creates all 6 corporate action tables if they do not exist.
- **`fetch_corporate_actions(session, act_type, start_date, end_date, existing_keys)`**: Fetches paginated corporate action records from Dhan API.
- **`insert_records(table_name, records)`**: Batch inserts unique new actions into the database.

#### 9.3.3 Live News Ingestion (`Backend/scripts/ingest_live_news.py`)

- **`load_existing_ids(conn)`**: Fetches all existing news article IDs.
- **`init_table()`**: Creates the `live_news` table if it does not exist.
- **`fetch_live_news(session, existing_keys)`**: Fetches the latest live market articles.
- **`insert_records(records)`**: Batch inserts new news records.

#### 9.3.4 Custom Scan Ingestion (`Backend/scripts/ingest_custom_scan.py`)

- **`load_existing_isins(conn)`**: Fetches all ISINs currently in the custom scan table.
- **`init_table()`**: Creates the `custom_scan` table if it does not exist.
- **`fetch_custom_scan(session, existing_keys)`**: Queries the technical screener metrics for all stocks.
- **`upsert_records(records)`**: Upserts (inserts or updates) stock records in the database.

---

## 10. Hosting the Website on Vercel

To host this website online for free using Vercel, follow these simple steps:

1. **Push your code to GitHub**: Create a repository on GitHub (or use your existing one) and push all project files.
2. **Log into Vercel**: Visit [vercel.com](https://vercel.com) and create an account using your GitHub account login.
3. **Import Project**: In the Vercel dashboard, click **Add New** ➔ **Project**. Select your GitHub repository from the list and click **Import**.
4. **Configure Environment Variables**: Expand the **Environment Variables** dropdown and add the following two keys:
   - **Key**: `DATABASE_URL`
   - **Value**: _[Your CockroachDB Connection String]_
   - **Key**: `CORP_ACT_LOOKAHEAD_DAYS`
   - **Value**: `90`
5. **Deploy**: Click the **Deploy** button. Vercel will build the Next.js app in the cloud, publish it, and give you a live shareable URL (like `singest.vercel.app`)!

---

## 11. Automated Daily Ingestion (GitHub Actions)

Instead of running python scripts on your local PC every day, we use **GitHub Actions** to automate the process completely. The scripts run automatically in the cloud, and you can download the logs anytime.

### 11.1 How it Works

A workflow file is saved in `.github/workflows/ingest.yml`.

- **Automatic Schedule**: It runs automatically every day at **8:00 AM Indian Standard Time (2:30 AM UTC)**.
- **Manual Trigger**: You can trigger a run at any time using a button on GitHub.
- **Artifacts**: At the end of every run, it saves the log files as an archive that you can download.

### 11.2 Initial Setup (Secrets Configuration)

Because your database string is private, you must save it securely on GitHub before the script can run:

1. Go to your repository page on GitHub.
2. Click the **Settings** tab at the top.
3. In the left sidebar, click **Secrets and variables** ➔ **Actions**.
4. Click the **New repository secret** button.
5. Enter:
   - **Name**: `DATABASE_URL`
   - **Value**: _[Your CockroachDB Connection String]_
6. Click **Add secret**.
7. _(Optional)_ Add a second secret named `CORP_ACT_LOOKAHEAD_DAYS` if you want to change the default 90 days lookahead window.

### 11.3 How to Run the Pipeline Manually

1. Go to the **Actions** tab at the top of your GitHub repository.
2. In the left list, click **Daily Stock Ingestion Pipeline**.
3. Click the **Run workflow** dropdown on the right side.
4. Click the green **Run workflow** button. It will start running instantly.

### 11.4 How to View & Download Logs

1. Go to the **Actions** tab and click on the latest run in the list (it will have a green checkmark if it succeeded or a red cross if it failed).
2. Scroll to the very bottom to find the **Artifacts** section.
3. Click on the file named `ingestion-logs-[run-id]`. This downloads a ZIP file containing the logs (`ingest_corporate_actions.log`, `ingest_live_news.log`, `ingest_custom_scan.log`) from that day's run.
