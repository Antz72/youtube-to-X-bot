name: Post YouTube Video to X

on:
  schedule:
    - cron: '*/30 * * * *' # Runs every 30 minutes
  workflow_dispatch: # Allows manual trigger

jobs:
  post-to-x:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      # Download the last-posted.txt artifact from the previous run
      - name: Download last posted ID
        uses: actions/download-artifact@v4
        with:
          name: last-posted-id
          path: .
        continue-on-error: true

      # Fallback if artifact AND file missing (first run or error)
      - name: Ensure last-posted.txt exists
        run: |
          if [ ! -f last-posted.txt ]; then
            echo "last-posted.txt not found, creating a new one"
            echo "0" > last-posted.txt
          fi

      - name: Print working directory and list files (for debugging)
        run: |
          echo "Current working directory: $(pwd)"
          echo "Files in this directory:"
          ls -la
          cat last-posted.txt || echo "last-posted.txt not found (unexpected after fallback step)"

      - name: Test Twitter API tokens
        env:
          TWITTER_API_KEY: ${{ secrets.TWITTER_API_KEY }}
          TWITTER_API_SECRET: ${{ secrets.TWITTER_API_SECRET }}
          TWITTER_ACCESS_TOKEN: ${{ secrets.TWITTER_ACCESS_TOKEN }}
          TWITTER_ACCESS_SECRET: ${{ secrets.TWITTER_ACCESS_SECRET }}
        run: node test-tokens.js

      - name: Install dependencies
        run: npm install rss-parser twitter-api-v2

      - name: Run script
        env:
          TWITTER_API_KEY: ${{ secrets.TWITTER_API_KEY }}
          TWITTER_API_SECRET: ${{ secrets.TWITTER_API_SECRET }}
          TWITTER_ACCESS_TOKEN: ${{ secrets.TWITTER_ACCESS_TOKEN }}
          TWITTER_ACCESS_SECRET: ${{ secrets.TWITTER_ACCESS_SECRET }}
        run: node post.js

      # Upload the updated last-posted.txt as an artifact for the next run
      - name: Upload last posted ID
        uses: actions/upload-artifact@v4
        with:
          name: last-posted-id
          path: last-posted.txt
          retention-days: 1 # You can adjust retention, 1 day means it's available for the next daily run
