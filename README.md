## Description

뉴로서킷 베이스 서버 (Nest)

해당 repository를 프로젝트에 맞게 별도로 업데이트해서 사용하세요.

기본적으로 JWT를 이용해 access >>> userId, refresh token >>> uuid 로 로그인이 구현되어 있고, refresh token은 DB에서 조회하도록 되어있습니다. redis에도 접속기록 저장하고 있으니 프로젝트에 따라서 수정하면 되겠습니다.

## Installation

```bash
$ npm install
```

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Test

```bash
# unit tests
$ npm run test
```
