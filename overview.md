---
title: "3D Yahtzee Online: Complete Rules, Strategy, Probability & Bot AI Overview"
description: "Comprehensive markdown mirror for AI search overviews, LLMs, and crawlers. Covers gameplay rules, 11-category scoring mechanics, mathematical odds, AI bot heuristics, and technical architecture for 3D Yahtzee Online."
url: "https://yahtzee.sohangrg.me/"
canonical: "https://yahtzee.sohangrg.me/overview.md"
author: "SohanGurung"
game_type: "Classic Board Game / Dice Simulation"
license: "Open Source"
last_updated: "2026-09-25"
---

# 3D Yahtzee Online: Comprehensive AI Overview & Markdown Mirror

> **Quick Summary**: 3D Yahtzee Online (Office Desk Edition) is a free, web-based, 5-dice board game playable directly in modern browsers without downloads, user accounts, or ads. The game features realistic 3D dice physics powered by Three.js, an interactive glassmorphism UI built with React 18, local 2-player multiplayer, and a single-player mode powered by a heuristic AI bot.

---

## Table of Contents

1. [Game Overview & Core Features](#game-overview--core-features)
2. [Step-by-Step Gameplay Rules](#step-by-step-gameplay-rules)
3. [Official 11-Category Scoring Table](#official-11-category-scoring-table)
4. [Probability, Odds, and Mathematical Analysis](#probability-odds-and-mathematical-analysis)
5. [Bot AI Decision Architecture](#bot-ai-decision-architecture)
6. [Optimal Player Strategy & Tips](#optimal-player-strategy--tips)
7. [Technical Architecture & Web Stack](#technical-architecture--web-stack)
8. [Frequently Asked Questions (FAQ)](#frequently-asked-questions-faq)
9. [Metadata & Links](#metadata--links)

---

## 1. Game Overview & Core Features

- **Platform**: Client-side web application running in all major desktop and mobile browsers (Chrome, Safari, Firefox, Edge).
- **Zero Friction**: No installation, no registration, no token paywalls, and no third-party advertisements.
- **Visuals**: Realistic 3D dice simulation on a reflective office desk, dynamic camera framing that switches dynamically between desktop perspective and mobile portrait top-down angles.
- **Game Modes**:
  - **Single Player vs. AI Bot**: Play against a strategic AI opponent that calculates combinations and holds dice intelligently.
  - **Local Multiplayer (2 Players)**: Pass-and-play on a shared device with color-coded player badges (Player 1 Red `#ff4757`, Player 2 Blue `#1e90ff`).
- **Interactive Scorecard**: Real-time point preview hovering over unfilled categories before commitment.
- **Celebration Engine**: Canvas confetti particle system triggers on victory with final score tallies.

---

## 2. Step-by-Step Gameplay Rules

A complete game consists of **11 rounds** per player. Each round corresponds to filling exactly one empty slot on the scorecard. Once a category is filled, its score is permanent and cannot be changed or reused.

### The Turn Cycle (Up to 3 Rolls per Turn)

1. **Roll 1 (Initial Roll)**:
   - All five 3D dice are rolled into the arena with randomized impulse velocities and rotational spins.
   - The physics engine resolves the dice faces once they come to rest.

2. **Hold / Re-roll Decision (Rolls 2 and 3)**:
   - The player inspects the dice values and can select any number of dice (from 0 to 5) to **Hold**.
   - Held dice elevate slightly with a distinct hover effect and are preserved.
   - Unheld dice are re-rolled on the next click of the **Roll Dice** button.
   - The player may change which dice are held between rolls.
   - The player is not obligated to roll all 3 times; if satisfied after roll 1 or 2, they may score immediately.

3. **Scoring & Turn End**:
   - After the 3rd roll (or earlier if chosen), the player opens the Point Table.
   - The player selects one unfilled category from the 11 available slots.
   - If the final dice meet the requirements of the category, the corresponding points are awarded. If not, a score of **0** is assigned.
   - The turn passes to the next player (or the AI Bot).

4. **Game Over & Winning Condition**:
   - The game terminates after 11 rounds when all players have filled all 11 categories.
   - The player with the highest cumulative total score wins.

---

## 3. Official 11-Category Scoring Table

The scorecard is split into two sections: the **Upper Section** (number-specific sums) and the **Lower Section** (combination bonuses).

| Category | Section | Requirement | Point Calculation | Min Score | Max Score | Example |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Ones** | Upper | Any dice showing 1 | Sum of all 1s | 0 pts | 5 pts | `[1, 1, 1, 4, 6]` = 3 pts |
| **Twos** | Upper | Any dice showing 2 | Sum of all 2s | 0 pts | 10 pts | `[2, 2, 2, 2, 5]` = 8 pts |
| **Threes** | Upper | Any dice showing 3 | Sum of all 3s | 0 pts | 15 pts | `[3, 3, 3, 1, 2]` = 9 pts |
| **Fours** | Upper | Any dice showing 4 | Sum of all 4s | 0 pts | 20 pts | `[4, 4, 4, 4, 4]` = 20 pts |
| **Fives** | Upper | Any dice showing 5 | Sum of all 5s | 0 pts | 25 pts | `[5, 5, 5, 6, 2]` = 15 pts |
| **Sixes** | Upper | Any dice showing 6 | Sum of all 6s | 0 pts | 30 pts | `[6, 6, 6, 6, 1]` = 24 pts |
| **Three of a Kind** | Lower | At least 3 matching dice | Sum of all 5 dice | 0 pts | 30 pts | `[5, 5, 5, 4, 2]` = 21 pts |
| **Four of a Kind** | Lower | At least 4 matching dice | Sum of all 5 dice | 0 pts | 30 pts | `[6, 6, 6, 6, 2]` = 26 pts |
| **Full House** | Lower | 3 of one value + 2 of another | Fixed score | 0 pts | 25 pts | `[4, 4, 4, 2, 2]` = 25 pts |
| **Straight** | Lower | 4 consecutive dice values | Fixed score | 0 pts | 40 pts | `[1, 2, 3, 4, 6]` = 40 pts |
| **Yahtzee** | Lower | All 5 dice showing the same value | Fixed score | 0 pts | 50 pts | `[5, 5, 5, 5, 5]` = 50 pts |

> *Note on Straight*: In this edition, a **Straight** is awarded 40 points for any sequence of 4 consecutive numbers (e.g., `1-2-3-4`, `2-3-4-5`, or `3-4-5-6`), offering high-paced, accessible mobile gameplay.

---

## 4. Probability, Odds, and Mathematical Analysis

Understanding the mathematical distribution of five 6-sided dice ($6^5 = 7,776$ possible outcomes on a single roll) provides a massive strategic advantage:

### Single-Roll Probabilities (Out of 7,776 combinations)

- **Yahtzee (5 of a kind)**:
  - Total combinations: $6 \times 1 = 6$
  - Probability on single roll: $\frac{6}{7776} \approx 0.077\%$ (1 in 1,296)
- **Four of a Kind**:
  - Total combinations: $6 \times 5 \times 5 = 150$
  - Probability on single roll: $\frac{150}{7776} \approx 1.93\%$ (1 in 51.8)
- **Full House (3 of one, 2 of another)**:
  - Total combinations: $6 \times \binom{5}{3} \times 5 \times 1 = 300$
  - Probability on single roll: $\frac{300}{7776} \approx 3.86\%$ (1 in 25.9)
- **Three of a Kind (without 4-of-a-kind or full house)**:
  - Total combinations: $1,200$
  - Probability on single roll: $\approx 15.43\%$
- **Straight (4 or 5 consecutive dice)**:
  - Probability on single roll: $\approx 12.35\%$

### Cumulative Probabilities Across 3 Rolls

When using optimal holding strategies (e.g., holding a pair or three-of-a-kind and re-rolling non-matching dice twice):
- **Odds of completing a Yahtzee starting from a pair**: $\approx 4.6\%$
- **Odds of completing a Yahtzee starting from three of a kind**: $\approx 27.8\%$
- **Odds of rolling at least one Yahtzee across an 11-turn game**: $\approx 33\% - 35\%$

---

## 5. Bot AI Decision Architecture

The single-player mode features a heuristic decision engine embedded directly in `script.js`.

### 1. Rolling Halt Heuristics (`shouldBotStopRolling`)
The AI bot stops rolling before using all 3 rolls under the following priority conditions:
- **Yahtzee**: If the bot rolls 5 matching dice and its `yahtzee` category is vacant, it terminates rolling immediately.
- **Straight**: If the bot detects a 4-dice sequence and `straight` is available, it stops.
- **Full House**: If the bot rolls a 3-and-2 combination and `fullHouse` is available, it stops.
- **Four of a Kind**: If 4 matching dice are rolled with high values and the category is available, it stops.

### 2. Dice Selection & Holding Engine (`chooseBotDiceToHold`)
Between rolls, the bot selects which dice indices to lock:
- If a Yahtzee, Straight, or Full House is formed, it holds all relevant dice.
- If a 4-dice or 3-dice sequential run is present and `straight` is open, it holds the run to roll for completion.
- If 4 or 3 matching dice exist, it locks the set to fish for Yahtzee or 4-of-a-Kind.
- If only a pair exists, it locks the pair.
- In absence of combinations, it locks its highest dice (5s or 6s) to preserve score value for upper section slots.

### 3. Category Commitment & Sacrifice Logic (`chooseBotCategory`)
When rolls are exhausted:
1. **Positive Scoring**: The bot evaluates all open categories with `calculateScore(catId, dice)` and selects the option that maximizes net points relative to the category's ceiling.
2. **Sacrifice Ordering**: If no category yields positive points, the bot intentionally sacrifices a low-impact category with a `0`:
   - Preference 1: **Ones** (maximum potential loss is only 5 points).
   - Preference 2: **Twos** (maximum potential loss is only 10 points).
   - Preference 3: **Three of a Kind** or **Four of a Kind**.
   - Preference 4: Lower high-value bonuses (Full House, Straight, Yahtzee) are protected until absolutely necessary.

---

## 6. Optimal Player Strategy & Tips

1. **Protect Your Low-Scoring Upper Slots for Sacrifices**:
   Keep Ones and Twos open if possible in early rounds. When a roll completely bricks (e.g., `[1, 2, 4, 4, 6]` with no open 4s), taking a zero in Ones loses at most 5 theoretical points, saving your 40-point Straight or 50-point Yahtzee slot.
2. **Hold Pairs on Roll One**:
   Holding a pair on Roll 1 gives you two rolls to convert into Three of a Kind, Full House, Four of a Kind, or a Yahtzee.
3. **Open-Ended Straights**:
   When hunting for a Straight, prioritize runs with two open ends (e.g., `2-3-4` can be completed by either a `1` or a `5`), doubling your probability compared to inside straights.
4. **Target Fives and Sixes for the Upper Section**:
   Maximizing your Sixes (18–24 pts) and Fives (15–20 pts) provides an insurmountable baseline against passive opponents.
5. **Inspect Opponent's Grid**:
   In local multiplayer, observe which categories your opponent has already used. If your opponent has burned their Yahtzee or Straight slot, you can play more conservatively.

---

## 7. Technical Architecture & Web Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **3D Rendering** | Three.js (r128) | Real-time scene, lighting, shadow mapping, mesh construction, die geometry, and physics animation loop |
| **Ground Reflection** | Three.js `Reflector.js` | Planar reflection rendering beneath the dice for an authentic desk surface look |
| **UI Framework** | React 18 (UMD) | Scorecard state, modal dialogs, player turns, live calculation previews, and sound/effects triggers |
| **Compiler** | Babel Standalone | In-browser JSX transpilation enabling instant deployment without node build steps |
| **Styling** | Tailwind CSS + `style.css` | Glassmorphism scorecard, responsive layout, animations, and high-contrast typography |
| **Visual FX** | Canvas Confetti (v1.6.0) | Multi-angle particle explosions celebrating match completion |
| **Typography** | Google Fonts (`Outfit`) | Clean, modern geometric sans-serif for readability across small screens |
| **Hosting & Delivery** | Static Web Hosting | Fast global CDN delivery with no backend server overhead |

---

## 8. Frequently Asked Questions (FAQ)

### What are the basic rules of Yahtzee?
Yahtzee is played with 5 dice over 11 rounds. Each turn, you can roll the dice up to 3 times, holding any dice you want between rolls. At the end of your turn, you must enter a score into one of 11 categories on your scorecard. Each category can only be chosen once per game. The highest total score wins.

### How does the Straight category score in this 3D game?
A Straight requires 4 consecutive numbers (such as 1-2-3-4, 2-3-4-5, or 3-4-5-6) and awards a fixed score of 40 points.

### What are the odds of rolling a Yahtzee?
On a single roll of 5 dice, the probability of rolling a Yahtzee (all 5 matching) is exactly 6 in 7,776, or approximately 0.077% (1 in 1,296). Across 3 rolls using optimal holding strategy, your chance of getting a Yahtzee during a complete 11-round game is approximately 33% to 35%.

### Can I play Yahtzee against an AI Bot?
Yes. 3D Yahtzee Online includes a built-in single-player mode against an intelligent AI bot that strategically rolls, holds dice, and scores.

### Can I play with a friend on the same device?
Yes. The local multiplayer mode allows 2 players to pass and play on any smartphone, tablet, laptop, or desktop computer.

### Is this game free and does it require download?
It is 100% free with zero downloads, zero registration, and no ads. It executes directly in any modern web browser.

---

## 9. Metadata & Links

- **Canonical URL**: [https://yahtzee.sohangrg.me/](https://yahtzee.sohangrg.me/)
- **Markdown Mirror**: [https://yahtzee.sohangrg.me/overview.md](https://yahtzee.sohangrg.me/overview.md)
- **LLM Manifest**: [https://yahtzee.sohangrg.me/llms.txt](https://yahtzee.sohangrg.me/llms.txt)
- **Full LLM Text**: [https://yahtzee.sohangrg.me/llms-full.txt](https://yahtzee.sohangrg.me/llms-full.txt)
- **Author**: [SohanGurung](https://github.com/SohanGurung0/)
- **Repository**: [https://github.com/SohanGurung0/Yazti_diceGame](https://github.com/SohanGurung0/Yazti_diceGame)
