# RoomMateMatch

This is a Next.js application built with Firebase Studio to help users find hostels and roommates. It uses Firebase for the backend and Genkit for AI-powered features.

## Project Structure

Here is an overview of the important files and folders in the project:

- **`src/app/`**: The core of the Next.js application. All pages, layouts, and routes are defined here.
- **`src/components/`**: Contains all reusable React components used to build the user interface (e.g., cards, buttons, forms).
- **`src/firebase/`**: Holds all the Firebase configuration (`config.ts`), providers, and custom hooks (`useUser`, `useDoc`, `useCollection`) for interacting with Firestore and Firebase Authentication.
- **`src/ai/`**: Contains the Genkit flows for AI-powered features, such as roommate matching and description enhancement.
- **`src/lib/`**: A place for shared utilities (`utils.ts`), type definitions (`types.ts`), and placeholder data.
- **`package.json`**: This file lists all the project's dependencies (like React, Next.js, Firebase) and defines the scripts to run, build, and test the application (`npm run dev`).
- **`firestore.rules`**: Defines the security rules for your Cloud Firestore database, ensuring users can only access the data they are permitted to.
- **`.env.local`**: This file (which you will create) stores your local environment variables, like API keys.

---

## Running Locally with VS Code

To run this project on your local machine using Visual Studio Code, follow these steps:

### Prerequisites

*   You must have [Node.js](https://nodejs.org/) installed (version 18 or later is recommended).
*   You need [npm](https://www.npmjs.com/) (which is included with Node.js) to manage packages.
*   You will need a free API key from [ImgBB](https://api.imgbb.com/) for the hostel image upload functionality.

### Setup Instructions

1.  **Open the Project in VS Code**:
    *   Launch VS Code.
    *   Go to `File > Open Folder...` and select the root directory of this project.

2.  **Install Dependencies**:
    *   Open the integrated terminal in VS Code (`View > Terminal` or `Ctrl+`` ` ``).
    *   In the terminal, run the following command to install all the necessary packages:
        ```bash
        npm install
        ```

3.  **Set Up Environment Variables**:
    *   In the root of the project, create a new file named `.env.local`.
    *   Open the `.env` file and copy its contents.
    *   Paste the copied content into your new `.env.local` file.
    *   Add your ImgBB API key to the `.env.local` file like this:
        ```
        NEXT_PUBLIC_IMGBB_API_KEY=your_imgbb_api_key_here
        ```

4.  **Run the Application**:
    *   This project requires two separate processes to run simultaneously: the Next.js web server and the Genkit AI server. You will need two terminals for this.

    *   **Terminal 1: Start the Web Server**
        *   In your first terminal, run the following command:
            ```bash
            npm run dev
            ```
        *   This will start the Next.js development server, usually on `http://localhost:9002`.

    *   **Terminal 2: Start the Genkit Server**
        *   Open a second terminal in VS Code (click the `+` icon in the terminal panel).
        *   In this new terminal, run the following command:
            ```bash
            npm run genkit:dev
            ```
        *   This starts the Genkit server, which handles the AI flows for features like roommate matching.

5.  **Access the App**:
    *   Once both servers are running, you can open your web browser and navigate to `http://localhost:9002` to see the application in action.
