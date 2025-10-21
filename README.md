# Game of Life on Torus

A web-based visualization of Conway's Game of Life simulated on the surface of a 3D torus. The cells are rendered as part of an SVG, animated and colored dynamically via JavaScript. This project is configured for both local Python hosting and static hosting via GitHub Pages.

## Features

*   Conway's Game of Life simulation.
*   Torus surface rendering with perspective-free (orthographic) projection.
*   Dynamic cell creation and updates via JavaScript.
*   Animated rainbow hue for live cells; small gray dots for dead cells.
*   Server auto-reloading during local development when files change.

## Local Development (Python)

To run the server locally:

1.  Ensure you have Python 3 installed.
2.  Navigate to the project directory in your terminal.
3.  Start the auto-reloader script (which will run the Python web server):
    ```bash
    nohup python3 reloader.py > reloader.log 2>&1 &
    ```
    (You can stop it later with `kill $(ps aux | grep reloader.py | grep -v grep | awk '{print $2}')`)
4.  Open your web browser and go to `http://localhost:8899/torus`.

The server will automatically restart if you make changes to `hello.py` or `game_of_life.js`.

## Static Hosting (GitHub Pages)

This project is configured to be hosted statically on GitHub Pages.

1.  Push this repository to GitHub.
2.  In your GitHub repository settings, go to "Pages."
3.  Under "Build and deployment," choose "Deploy from a branch."
4.  Select your `main` (or `master`) branch and the `/ (root)` folder.
5.  Save the changes.
6.  Your project will be accessible at `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/index.html`.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
