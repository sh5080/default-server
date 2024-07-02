pipeline {
    agent any

    environment {
        DEVELOP_KEY = credentials('NEUROCIRCUIT_KEY')
        gitBranch = ''
    }

    stages {
        stage('Checkout') {
            steps {
                script {
                    gitBranch = env.GIT_BRANCH.replaceAll('origin/', '')
                    git branch: gitBranch, url: '깃허브 주소'
                    echo "gitBranch 값1: ${gitBranch}"
                }
            }
        }

        stage('Build and Deploy') {
            when { 
                expression { gitBranch == 'master' }
            }
            steps {
                script {
                    def nodeHome = tool 'nodeJS'
                    env.PATH = "${nodeHome}/bin:${env.PATH}"
                }

                script {
                    try {
                        sh 'ssh -i "${DEVELOP_KEY Jenkins 환경변수}" ${DEVELOP_USERNAME Jenkins 환경변수}@${PROJECT_HOST Jenkins 환경변수} -p ${DEVELOP_PORT Jenkins 환경변수} \'pwd && cd /서버 프로젝트 경로 && git pull origin master && git checkout . && npm install && npm run update:prod\''
                    } catch (Exception e) {
                        sh 'ssh -i "${DEVELOP_KEY Jenkins 환경변수}" ${DEVELOP_USERNAME Jenkins 환경변수}@${PROJECT_HOST Jenkins 환경변수} -p ${DEVELOP_PORT Jenkins 환경변수} \'pwd && cd /서버 프로젝트 경로 && git pull origin master && git checkout . && export NVM_DIR=~/.nvm && source ~/.nvm/nvm.sh && nvm use --delete-prefix v20.10.0 --silent && npm install && npm run update:prod\''
                        currentBuild.result = 'FAILURE'
                        error "Build and Deploy 단계에서 오류 발생: ${e.message}"
                    }
                }
            }
        }
    }

    post {
        always {
            echo "파이프라인 실행 결과: ${currentBuild.result}"
        }
        success {
            script {
                def discordWebhook = env.DISCORD_WEBHOOK
                def discordWebhookFE = env.DISCORD_WEBHOOK_FE
                def buildStatus = currentBuild.result ?: 'unknown'
                def commitSha = env.GIT_COMMIT
                def commitMessage = sh(script: 'git log --format=%B -n 1 $GIT_COMMIT', returnStdout: true).trim()
                def githubCommitUrl = "깃허브 주소/commit/${commitSha}"
                def discordTitle = gitBranch.contains('develop') ? '커밋 완료' : '빌드 및 배포 정상작동 완료'

                def payload = """
                {
                    "embeds": [
                        {
                            "title": "${discordTitle}",
                            "description": "The build and deployment process was successful.",
                            "color": 3066993,
                            "fields": [
                                {"name": "Build Status", "value": "${buildStatus}", "inline": true},
                                {"name": "Commit Message", "value": "${commitMessage}", "inline": false},
                                {"name": "Commit", "value": "[${commitSha}](${githubCommitUrl})", "inline": false},
                                {"name": "Build Number", "value": "${env.BUILD_NUMBER}", "inline": false},
                                {"name": "Branch", "value": "${gitBranch}", "inline": false}
                            ]
                        }
                    ]
                }
                """
                sh "curl -X POST -H 'Content-type: application/json' --data '${payload}' ${discordWebhook}"
            }
        }

        failure {
            script {
                def discordWebhook = env.DISCORD_WEBHOOK
                def discordWebhookFE = env.DISCORD_WEBHOOK_FE
                def buildStatus = currentBuild.result ?: 'unknown'
                def commitSha = env.GIT_COMMIT
                def commitMessage = sh(script: 'git log --format=%B -n 1 $GIT_COMMIT', returnStdout: true).trim()
                def githubCommitUrl = "깃허브 주소/commit/${commitSha}"

                def payload = """
                {
                    "embeds": [
                        {
                            "title": "젠킨스 확인 필요",
                            "description": "The build and deployment process failed.",
                            "color": 15158332,
                            "fields": [
                                {"name": "Build Status", "value": "${buildStatus}", "inline": true},
                                {"name": "Commit Message", "value": "${commitMessage}", "inline": false},
                                {"name": "Commit", "value": "[${commitSha}](${githubCommitUrl})", "inline": false},
                                {"name": "Build Number", "value": "${env.BUILD_NUMBER}", "inline": false},
                                {"name": "Branch", "value": "${gitBranch}", "inline": false}
                            ]
                        }
                    ]
                }
                """
                sh "curl -X POST -H 'Content-type: application/json' --data '${payload}' ${discordWebhook}"
            }
        }
    }
}
