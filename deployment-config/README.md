# Helpful Information about cloud builders
___

## NPM
___
When using the gcr.io/cloud-builders/npm builder in Google Cloud Build, you can use the following environment variables to configure the behavior of the npm command:
- NPM_TOKEN: An npm token that is used to authenticate to the npm registry.
- NPM_CONFIG_REGISTRY: The URL of the registry to use.
- NPM_CONFIG_EMAIL: The email address to use when publishing a package.
- NPM_CONFIG_ALWAYS_AUTH: A boolean value that determines whether to always send authentication credentials to the registry.
- NPM_CONFIG_PACKAGE_LOCK: A boolean value that determines whether to generate a package-lock.json file.

You can also use any other environment variables that are recognized by the npm command. For example, you can use the npm_config_loglevel environment variable to set the log level for npm commands:

Example:

```
steps:
  - name: 'gcr.io/cloud-builders/npm'
    args: ['install']
    env:
      - 'NPM_CONFIG_REGISTRY=<registry-url>'
      - 'NPM_CONFIG_EMAIL=<service-account-email>'
      - 'NPM_CONFIG_ALWAYS_AUTH=true'
      - 'GOOGLE_APPLICATION_CREDENTIALS=<path-to-service-account-key-file>'
```
___
## Maven
___
When using the gcr.io/cloud-builders/mvn builder in Google Cloud Build, 
you can use the following environment variables to configure the behavior 
of the mvn command:

- MAVEN_OPTS: Additional options to pass to the mvn command.
- MVN_GOAL: The goal to execute with the mvn command.
- MVN_PHASE: The build phase to execute with the mvn command.

- You can also use any other environment variables that are recognized by the mvn command. For example, you can use the MAVEN_HOME environment variable to specify the location of the Maven installation:

Examples:
MAVEN_OPTS is an environment variable that you can use to pass additional 
options to the mvn command when building a Maven project 
with the gcr.io/cloud-builders/mvn builder in Google Cloud Build. 
Here's an example of how you can use it in a cloudbuild.yaml file:

```
steps:
    - name: 'gcr.io/cloud-builders/mvn'
      args: ['install']
      env: ['MAVEN_OPTS=-Xmx1024m']
```
You can pass multiple options to MAVEN_OPTS by separating them with a space. 
For example:

```
steps:
  - name: 'gcr.io/cloud-builders/mvn'
    args: ['install']
    env: ['MAVEN_OPTS=-Xmx1024m -Dmaven.test.skip=true']
```