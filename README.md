# Scope
The easiest way to connect rr (sonarr, radarr, prowlarr, etc) to put.io

# No external Services Dependencies
This is built purposefully without any external service dependencies. You do not need any database
and can be configured entirely over environment variables.

# Quality of Life
A large chunk of the code is unit tested to ensure things work as expected and project can evolve without breaking.

# How to run
The codebase is built using `nestjs` running on `nodejs 20.x`. It will most likely run on earlier `nodejs` versions
as well but it is not tested.

# Configuration
Either provide a `.env` file or set the variables as seen in the `.env.example` file in your environment. The `.env.example`
you see contains the default values. Those marked with `xxx` need to be setup for your system by you. Just follow the
in-place instructions.

## Watcher
You can link a local folder to a put.io folder. The watcher will watch the local folder and upload any new files to the
put.io folder. This is useful for automatically uploading files from your download folder to put.io. in the correct folder.
You can create multiple watchers for multiple folders and upload in a single put.io folder or a have a dedicated put.io
folder per local folder.

### Scenario
Let's assume you have 2 folders you want to watch and you wish to download the files also two seperate folders.

#### Watchers
One folder is coming from blackhole sonarr and another from blackhole radarr.
You want to upload the files to put.io in the `tv` folder for sonarr and `movies` folder for radarr.
Let's assume your local folder structure looks something like this
```
/my/downloads
    /sonarr
    /radarr   
```

Now in your put.io account let's assume you have the following folder structure
```
/tv (id: 123)
/movies (id: 456)
```
Clicking on a folder in put.io will show you the folder id in the URL. For example, if you click on the `tv` folder
and the URL is `https://app.put.io/files/123` then the folder id is `123`.

So, let's set up the watchers
```dotenv
WATCHER_TARGETS=/my/downloads/sonarr:123;/my/downloads/radarr:456
```

#### Downloaders
Based on the structure mentioned above, you can set up the downloaders as follows
```dotenv
DOWNLOADERS=/my/downloads/sonarr:123;/my/downloads/radarr:456
```

It is up to you how you want to structure your folders. You could for example download 2 put.io folders in a single folder
on your local machine like this
```dotenv
DOWNLOADERS=/my/downloads:123;/my/downloads:456
```


# Development
This is a basic monorepo using npm workspaces. To execute namespace command use the following syntax
```shell
# Launch the backend in development mode
npm run -w backend start:dev
```

## Fullstack Development
Fullstack development environment with hot reload for both frontend and backend. The frontend is built using `react` with `vite` and the backend is built using `nestjs`.
To start the development environment for fullstack run the following commands.
```shell
# Launch backend
npm -w backend run start:dev

# Launch react
npm -w client run dev
```
Vite is proxying for the backend. It's all accessible on `http://localhost:4000`


## GraphQL Query
We are using https://tanstack.com/query/latest

## Forms
We are using https://react-hook-form.com/ 

## Validation
We are using https://zod.dev/

## UI
We are using https://mui.com/ (material design)

## Routing
We are using https://reactrouter.com/en/main (react-router-dom)

## Charts
We are using https://nivo.rocks/
