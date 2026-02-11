# JTX People - Sistema de Gestión

Sistema completo de gestión de personas con arquitectura de microservicios.

## 🚀 Características

- **Frontend Moderno**: HTML5, CSS3, JavaScript Vanilla
- **Arquitectura de Microservicios**: 
  - Auth Service (Autenticación)
  - Users Service (Gestión de usuarios)
  - API Gateway
- **Base de Datos**: MongoDB
- **Contenedores Docker**: Fácil despliegue
- **REST API**: Documentada y escalable

## 📋 Prerrequisitos

- Docker 20.10+
- Docker Compose 2.0+
- Git
- Node.js 16+ (para desarrollo)

## 🛠️ Instalación

### Método 1: Docker (Recomendado)

```bash
# Clonar repositorio
git clone https://github.com/fherross3-ops/JTX-People.git
cd JTX-People

# Copiar variables de entorno
cp .env.example .env

# Desplegar con Docker
chmod +x deploy.sh
./deploy.sh