def environments = ["UNSPECIFIED"]
def environmentCreds = ["UNSPECIFIED"]

pipeline {
    agent any
    stages {
        stage('Prepare env variables') {
            steps {
                withFolderProperties {
                    sh 'printenv'
                    script {
                        echo "Branch: ${env.BRANCH_NAME}"
                        if ("${env.BRANCH_NAME}" == 'main') {
                            echo 'Building for Prod....';
                            environments = []
                            environments += [ "${env.PUB_LOCATION_PROD}" ]
                            environmentCreds = []
                            environmentCreds += [ "${env.PUB_LOCATION_PROD_CREDS}" ]
                        } else if ("${env.BRANCH_NAME}" == 'develop') {
                            echo 'Building for Dev....';
                            environments = []
                            environments += [ "${env.PUB_LOCATION_DEV}" ]
                            environmentCreds = []
                            environmentCreds += [ "${env.PUB_LOCATION_DEV_CREDS}" ]
                        }
                        environments.each { env ->
                            echo 'env: ' + env;
                        } 
                        environmentCreds.each { cred ->
                            echo 'cred: ' + cred;
                        }
                    }
                }
            }
        }
        stage('Spin Up Dev Environment') {
            steps {
                script {
                    // Clean up any existing containers and volumes to force fresh DB
                    sh 'docker compose -f .devcontainer/docker-compose.yml down --volumes --remove-orphans || true'
                    
                    // Remove the persistent data directory to force fresh DB initialization
                    sh 'rm -rf .devcontainer/data'
                    
                    // Rebuild database image to ensure latest init scripts are included
                    sh 'docker compose -f .devcontainer/docker-compose.yml build --no-cache db'
                    
                    // Spin up the Docker Compose environment
                    sh 'docker compose -f .devcontainer/docker-compose.yml up -d'
                    sh 'docker compose -f .devcontainer/docker-compose.yml exec -w /workspace app npm install'
                }
            }
        }
        stage('Run ESLint') {
            steps {
                script {
                    // Run ESLint inside the "app" service container
                    sh 'docker compose -f .devcontainer/docker-compose.yml exec -w /workspace app eslint'
                }
            }
        }
        stage('Run Jest Tests') {
            steps {
                script {
                    // Run Jest tests inside the "app" service container
                    sh 'docker compose -f .devcontainer/docker-compose.yml exec -w /workspace app npm test'
                }
            }
        }
        stage('Setting version') {  
            steps {
                script {
                    docker.image('node:18').inside {
                        sh "npm --no-git-tag-version version 1.0.$BUILD_NUMBER"
                    }
                }
            }
        }
        stage('Publish') {  
            steps {
                script {
                    environments.eachWithIndex { env, idx ->   
                        echo 'Publishing to: ' + env + "/rx_function_api using creds: " + environmentCreds[idx];
                        docker.withRegistry("https://" + env + "/rx_function_api", "ecr:us-east-2:" + environmentCreds[idx]) {
                            def dockerImage = docker.build(env + "/rx_function_api:1.0.$BUILD_NUMBER")
                            dockerImage.push()
                            dockerImage.push("latest")
                        }
                    }
                }
            }
        }
    }
    post {
        always {
            script {
                // Tear down the Docker Compose environment
                sh 'docker compose -f .devcontainer/docker-compose.yml down --volumes --remove-orphans'
            }
            cleanWs()
        }
    }
}