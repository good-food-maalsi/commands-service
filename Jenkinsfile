pipeline {
    agent any

    environment {
        REGISTRY         = 'rg.fr-par.scw.cloud/good-food-container-registry'
        IMAGE_NAME       = 'commands-service'
        DOCKER_CREDS     = credentials('docker-hub-creds')
        JWT_SECRET       = 'test-secret'
    }

    stages {

        // ─── 1. CHECKOUT ─────────────────────────────────────────────────────────
        stage('Checkout') {
            steps {
                checkout scm

                // Récupère le dépôt de contrats partagés (comme dans GitHub Actions)
                dir('good-food-contracts') {
                    git(
                        url: 'https://github.com/good-food-maalsi/good-food-contracts.git',
                        branch: 'main'
                    )
                }
            }
        }

        // ─── 2. INSTALL ──────────────────────────────────────────────────────────
        stage('Install Dependencies') {
            steps {
                sh '''
                    bun install ./good-food-contracts
                    bun install --frozen-lockfile
                '''
            }
        }

        // ─── 3. PRISMA GENERATE ──────────────────────────────────────────────────
        stage('Generate Prisma Client') {
            steps {
                sh 'bun run db:generate'
            }
        }

        // ─── 4. TYPE CHECK ───────────────────────────────────────────────────────
        stage('Type Check') {
            steps {
                sh 'bun run typecheck'
            }
        }

        // ─── 5. BUILD ────────────────────────────────────────────────────────────
        stage('Build') {
            steps {
                sh 'bun build ./src/app.ts --outdir ./dist --target bun'
            }
        }

        // ─── 6. TEST ─────────────────────────────────────────────────────────────
        stage('Run Tests') {
            steps {
                sh 'bun test'
            }
        }

        // ─── 7. DOCKER BUILD & PUSH ──────────────────────────────────────────────
        // Ce stage tourne seulement sur la branche main (comme le workflow deploy.yml)
        stage('Docker Build & Push') {
            when {
                branch 'main'
            }
            steps {
                script {
                    def commitSha = sh(script: 'git rev-parse HEAD', returnStdout: true).trim()

                    sh """
                        docker build -f Dockerfile.prod \\
                            -t ${REGISTRY}/${IMAGE_NAME}:latest \\
                            -t ${REGISTRY}/${IMAGE_NAME}:${commitSha} \\
                            .

                        docker push ${REGISTRY}/${IMAGE_NAME}:latest
                        docker push ${REGISTRY}/${IMAGE_NAME}:${commitSha}
                    """
                }
            }
        }
    }

    // ─── POST-ACTIONS ─────────────────────────────────────────────────────────
    post {
        success {
            echo '✅ Pipeline terminé avec succès !'
        }
        failure {
            echo '❌ Le pipeline a échoué. Vérifiez les logs ci-dessus.'
        }
        always {
            // Nettoyage de l'espace de travail après chaque run
            cleanWs()
        }
    }
}
