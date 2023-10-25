const express = require('express');
const app = express();
const port = 3000;
const session = require('express-session');
const flash = require('connect-flash');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));
app.set('view engine', 'ejs');


// Configura el almacenamiento de archivos con multer
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Establece la carpeta pública para archivos estáticos
app.use(express.static('public'));

// Define la ruta del archivo de productos
const productosFilePath = 'productos.json';


// ----------RUTA DE INICIO DE SESIÓN -----------------

app.use(session({
    secret: 'tu_secreto',
    resave: false,
    saveUninitialized: true
}));
app.use(flash());

// --------------------


// Ruta de inicio de sesión (GET)
app.get('/login', (req, res) => {
    res.render('login'); // Crea la vista de inicio de sesión
});
// Ruta de administrador (GET)
app.get('/admin', (req, res) => {
    const productos = cargarProductos();
    res.render('admin', { productos: productos });
});

app.get('/usuario', (req, res) => {
    const productos = cargarProductos();
    res.render('usuario', { productos: productos });
});

// Ruta de inicio de sesión (POST)
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Busca al usuario en el archivo usuarios.json
    const usuarios = cargarUsuarios();
    const usuario = usuarios.find(user => user.username === username && user.password === password);

    if (usuario) {
        req.session.user = { username: usuario.username, role: usuario.role };
        if (usuario.role === 'admin') {
            return res.redirect('/admin');
        } else {
            return res.redirect('/usuario');
        }
    } else {
        req.flash('error_msg', 'Credenciales incorrectas');
        return res.redirect('/login');
    }
});
// Ruta de administrador
app.get('/admin', (req, res) => {
    if (req.session.user && req.session.user.username === 'admin') {
        return res.render('admin');
    } else {
        return res.redirect('/login');
    }
});
// Ruta de usuario
app.get('/usuario', (req, res) => {
    if (req.session.user && req.session.user.username === 'usuario') {
        return res.render('usuario');
    } else {
        return res.redirect('/login');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error al cerrar sesión:', err);
        }
        res.redirect('/login');
    });
});

// -------------------- Cargar datos --------------

function cargarUsuarios() {
    try {
        const data = fs.readFileSync('usuarios.json', 'utf8');
        return JSON.parse(data) || [];
    } catch (error) {
        console.error('Error al cargar usuarios:', error);
        return [];
    }
}

// Carga los productos desde el archivo JSON
function cargarProductos() {
    try {
        const data = fs.readFileSync(productosFilePath, 'utf8');
        return JSON.parse(data) || [];
    } catch (error) {
        console.error('Error al cargar productos:', error);
        return [];
    }
}
// ------------- Vista programadores --------

app.get('/programadores', (req, res) => {
    res.render('programadores'); // Renderiza la vista "programadores.ejs"
});


// --------------Ruta para la vista de registro (GET) ---------------------
// Ruta para la vista de registro (GET)
app.get('/registro', (req, res) => {
    res.render('registro'); // Renderiza la vista de registro
});

// Ruta para manejar el registro (POST)
app.post('/registrarse', (req, res) => {
    const { username, password, email } = req.body;

    // Cargar usuarios actuales desde el archivo usuarios.json
    const usuarios = cargarUsuarios();

    // Verificar si el nombre de usuario ya existe
    if (usuarios.some(usuario => usuario.username === username)) {
        return res.status(400).send('El nombre de usuario ya existe. Elija otro nombre.');
    }

    // Crear un nuevo usuario
    const nuevoUsuario = {
        username: username,
        password: password, // ¡Nota importante! Esto no es seguro. Deberías almacenar contraseñas de manera segura (usar bcrypt, por ejemplo).
        email: email,
        role: 'usuario',
    };

    // Agregar el nuevo usuario a la lista de usuarios
    usuarios.push(nuevoUsuario);

    // Guardar la lista actualizada de usuarios en usuarios.json
    guardarUsuarios(usuarios);

    // Redirigir a una página de inicio de sesión u otra página deseada
    res.redirect('/login');
});

// Función para guardar usuarios en usuarios.json
function guardarUsuarios(usuarios) {
    try {
        fs.writeFileSync('usuarios.json', JSON.stringify(usuarios, null, 4), 'utf8');

        usuario.get().email

    } catch (error) {
        console.error('Error al guardar usuarios:', error);
    }
}

// --------------------------------------------------------------




// Guarda los productos en el archivo JSON
function guardarProductos(productos) {
    try {
        fs.writeFileSync(productosFilePath, JSON.stringify(productos, null, 4), 'utf8');

    } catch (error) {
        console.error('Error al guardar productos:', error);
    }
}

// Ruta de inicio de sesión (GET)
app.get('/login', (req, res) => {
    res.sendFile(__dirname + '/views/login.html');
});

// Ruta de inicio de sesión (POST) - Aquí puedes manejar la autenticación
app.post('/login', (req, res) => {
    // Lógica de autenticación aquí
    // ...
    // Después de la autenticación, redirigir al panel correspondiente (usuario o administrador)
    res.redirect('/admin'); // Cambia '/admin' a la ruta deseada
});

// Ruta principal, redirige a la página de inicio de sesión
app.get('/', (req, res) => {
    res.redirect('/login');
});



// Ruta para agregar un producto (POST)
app.post('/admin/agregar-producto', upload.single('imagen'), (req, res) => {
    // Procesa los datos del formulario para agregar un producto
    const { nombre, descripcion, precio } = req.body;
    const imagen = req.file;

    // Valida que se hayan proporcionado los datos necesarios
    if (!nombre || !descripcion || !precio || !imagen) {
        return res.status(400).send('Por favor, complete todos los campos y adjunte una imagen.');
    }

    // Crea un objeto de producto con los datos recibidos
    const producto = {
        id: Date.now(),
        nombre: nombre,
        descripcion: descripcion,
        precio: parseFloat(precio),
        nombreImagen: imagen.originalname,
    };

    // Guarda la imagen redimensionada
    sharp(imagen.buffer)
        .resize(200, 200)
        .toFile(`public/images/resized/${imagen.originalname}`, (err, info) => {
            if (err) {
                return res.status(500).send('Error al guardar la imagen.');
            }

            // Carga los productos actuales y agrega el nuevo producto
            const productos = cargarProductos();
            productos.push(producto);

            // Guarda los productos en el archivo JSON
            guardarProductos(productos);

            // Redirige nuevamente a la página de administrador después de agregar el producto
            res.redirect('/admin');
        });
});

// Ruta para eliminar un producto (GET)
app.get('/admin/eliminar-producto/:id', (req, res) => {
    const idProducto = req.params.id;
    const productos = cargarProductos();

    // Encuentra el producto por su ID y elimínalo
    const productoAEliminar = productos.find(producto => producto.id === parseInt(idProducto));

    if (!productoAEliminar) {
        return res.status(404).send('Producto no encontrado');
    }

    // Elimina el producto de la lista de productos
    const nuevosProductos = productos.filter(producto => producto.id !== parseInt(idProducto));
    guardarProductos(nuevosProductos);

    // Redirige nuevamente a la página de administrador después de eliminar el producto
    res.redirect('/admin');
});

// Ruta para editar un producto (GET)
app.get('/admin/editar-producto/:id', (req, res) => {
    const idProducto = req.params.id;
    const productos = cargarProductos();

    // Encuentra el producto por su ID
    const productoAEditar = productos.find(producto => producto.id === parseInt(idProducto));

    if (!productoAEditar) {
        return res.status(404).send('Producto no encontrado');
    }

    // Renderiza la vista de edición con los detalles del producto
    res.render('editar-producto', { producto: productoAEditar });
});

// Ruta para guardar la edición de un producto (POST)
app.post('/admin/editar-producto/:id', (req, res) => {
    const idProducto = req.params.id;
    const productos = cargarProductos();

    // Encuentra el producto por su ID
    const productoAEditar = productos.find(producto => producto.id === parseInt(idProducto));

    if (!productoAEditar) {
        return res.status(404).send('Producto no encontrado');
    }

    // Procesa los datos del formulario para editar el producto
    const { nombre, descripcion, precio } = req.body;

    // Actualiza los detalles del producto
    productoAEditar.nombre = nombre;
    productoAEditar.descripcion = descripcion;
    productoAEditar.precio = parseFloat(precio);

    // Procesa la imagen si se cargó una nueva
    if (req.file) {
        const imagePath = path.join(__dirname, 'public/images', req.file.filename);

        // Redimensiona y guarda la imagen con Sharp
        sharp(imagePath)
            .resize(200, 200) // Ajusta el tamaño según tus necesidades
            .toFile(path.join(__dirname, 'public/images/resized', req.file.filename), (err) => {
                if (err) {
                    console.error('Error al redimensionar la imagen:', err);
                } else {
                    console.log('Imagen redimensionada y guardada.');
                }
            });

        // Actualiza la propiedad 'nombreImagen' del producto con el nuevo nombre de archivo
        productoAEditar.nombreImagen = req.file.filename;
    }

    // Guarda los productos actualizados en el archivo JSON
    guardarProductos(productos);

    // Redirige nuevamente a la página de administrador después de editar el producto
    res.redirect('/admin');
});

// Inicia el servidor
app.listen(port, () => {
    console.log(`Servidor en ejecución en el puerto ${port}`);
});

// -------------------- RUTA PARA USUARIO ----------------------

app.get('/usuario', (req, res) => {
    const productos = cargarProductos(); // Carga la lista de productos desde el archivo JSON
    res.render('usuario', { productos: productos });
});
