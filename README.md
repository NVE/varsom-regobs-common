# VarsomRegobsCommon

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 6.2.5.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `--prod` flag for a production build.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via [Protractor](http://www.protractortest.org/).

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI README](https://github.com/angular/angular-cli/blob/master/README.md).


## How to link npm package while developing:

It is useful to link library locally when developing.

Build project (npm run build), go to dist folder and for each varsom-regobs-common project folder (with package.json) and type:

npm link

[https://docs.npmjs.com/cli/link]
[https://angular.io/guide/creating-libraries]
[https://medium.com/dailyjs/how-to-use-npm-link-7375b6219557]


## How to create a new release

Create new release branch in git flow:
`git flow release start v3.0.5 develop`

Bump package version to a new version in
package.json
packages/core/package.json
packages/registration/package.json
packages/regobs-api/package.json

Remember to also update peerDependencies if breaking changes.

Finish release:
`git flow release finish v3.0.5`
`git push origin --tags`

A new version is released in npm using Azure Devops
