# Spec: wireframe das telas

Status: aceito  
Fase: mock UI  
Fora: gerar imagem, Figma, crawler

## Contexto

Cada tela precisa de um wireframe HTML derivado do nome, rota, descrição e componentes — não um stub genérico.

## Critérios

### AC-1 Blocos dos componentes
Dado nome, rota e componentes, quando monta o HTML, então o documento inclui o nome da tela e o nome de cada componente.

### AC-2 Plano persistido
Dado um plano com telas e componentes, quando cria o projeto, então `wireframe_html` de cada tela contém esses componentes.

### AC-3 Prévia acompanha o rascunho
Dado o editor de telas, quando os componentes existem, então a prévia não usa o texto “Wireframe inicial”.
