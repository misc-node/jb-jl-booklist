'use strict';

// Application Dependencies
const express = require('express');
const superagent = require('superagent');
const pg = require('pg');
require('dotenv').config();

const methodOverride = require ('method-override');

// Application Setup
const app = express();
const PORT = process.env.PORT || 3000;

// Utilize ExpressJS functionality to parse the body of the request
app.use(express.urlencoded({ extended: true }));

// Database Setup
const client = new pg.Client(process.env.DATABASE_URL);
client.connect();
client.on('error', err => console.log(err));


// Set the view engine for server-side templating
app.set('view engine', 'ejs');
app.use(express.static('./public'));

app.use(methodOverride ((request, response) => {
  if (request.body && typeof request.body === 'object' && '_method' in request.body) {
    let method = request.body._method;
    delete request.body._method;
    return method;
  }
}))

// API Routes
app.get('/', getBooks);
app.get('/searches/new', (request, response) => {
  response.render('pages/searches/new');
})

app.get('/pages/books/detail', (request, response) => {
  response.render('pages/books/detail');
})

app.get('/pages/books/show', (request, response) => {
  response.render('pages/books/show');
})

app.post('/searches', createSearch);
app.post('/book', createBook);
app.get('/book/:id', getBook);

app.post('/update/:id', updateBook);// to listen for "update" on index.ejs

app.get('/home-detail/:id', detailHome)
app.delete('/book/:id', deleteFromDB);


// app.put('/update/:id', updateBook)




function createSearch(request, response) {
  let url = 'https://www.googleapis.com/books/v1/volumes?q=';
  if (request.body.search[1] === 'title') { url += `+intitle:${request.body.search[0]}`; }
  if (request.body.search[1] === 'author') { url += `+inauthor:${request.body.search[0]}`; }

  superagent.get(url)
    .then ( result => {
      const bookArray = result.body.items.map(book => new Book(book));
      const bookArrayLimit10 = [];
      if(bookArray.length > 10) {
        for(let i = 0; i < 10; i++) {
          bookArrayLimit10.push(bookArray[i]);
        }
        return bookArrayLimit10;
      }
      return bookArray;
    })
    .then(
      books => {
        response.render('pages/searches/show', {bookList: books});
      })
    .catch ( error => {
      response.render('pages/error', {errorMsg: error});
    })
}


function Book (book) {

  const placeHolderImg = 'https://i.imgur.com/J5LVHEL.jpg';

  this.title = book.volumeInfo.title || 'No book title found.';
  // console.log('book.volumeInfo.authors', book.volumeInfo.authors);
  this.author = book.volumeInfo.authors ? book.volumeInfo.authors[0] : 'No author found.'; //maybe multiple authors
  this.description = book.volumeInfo.description || 'No description found.';
  this.img_url = book.volumeInfo.imageLinks ? book.volumeInfo.imageLinks.thumbnail : placeHolderImg;
  this.isbn = book.volumeInfo.industryIdentifiers ? `ISBN: ${book.volumeInfo.industryIdentifiers[0].identifier}` : 'No ISBN found.'
  // this.bookshelf = 'Please put in bookshelf';
  this.showDetails ='Show Details';
}

// Helper functions
function getBooks(request, response) {
  let SQL = 'SELECT * FROM books;';

  return client.query(SQL)
    .then(results => response.render('pages/index', {bookList: results.rows}))
    .catch(error => {
      response.render('pages/error', {errorMsg: error});
    });
}

function createBook(request, response) {
  let normalizedBookShelf = request.body.bookshelf.toLowerCase();
  let {title, author, isbn, img_url, description} = request.body;

  let SQL = `INSERT INTO books (title, author, isbn, image_url, description, bookshelf) VALUES ($1, $2, $3, $4, $5, $6);`;
  let values = [title, author, isbn, img_url, description, normalizedBookShelf];

  return client.query(SQL, values)
    .then(() => {
      SQL = 'SELECT * FROM books WHERE isbn=$1;';
      values = [request.body.isbn];
      return client.query(SQL, values)
        .then(result => response.redirect(`/book/${result.rows[0].id}`))
        .catch(error => console.log(error));
    })
    .catch(error => console.log(error))
}

function getBook (request, response) {
  let SQL = 'SELECT * FROM books WHERE id=$1;';
  let values = [request.params.id];
  client.query(SQL, values)
    .then(result => response.render('pages/books/show', {bookSaved: result.rows[0]})
    );
}

function updateBook (request, response){
  let SQL = `
    UPDATE books
    SET 
      title=$1,
      author=$2,
      isbn=$3,
      image_url=$4,
      description=$5,
      bookshelf=$6
    WHERE id=$7;`;

  let values = [request.body.title, request.body.author, request.body.isbn, request.body.image_url, request.body.description, request.body.bookshelf, request.params.id];

  client.query(SQL, values)
    .then(response.redirect(`/home-detail/${request.params.id}`));
}

function deleteFromDB(request, response) {

  let SQL = `DELETE FROM books WHERE id=$1;`;

  let values = [request.params.id];
  console.log('CONSOLE LOG OF VALUES::::::: ', values);

  return client.query(SQL, values)
    .then(response.redirect('/'))
    .catch(error => console.log(error));
}

function detailHome(request, response) {
  let SQL = 'SELECT * FROM books WHERE id=$1;';
  let values = [request.params.id];
  return client.query(SQL, values)
    .then( result => response.render('pages/books/detail', {bookSaved: result.rows[0]}));

}





app.get('*', (request, response) => response.status(404).send('This route does not exist'));
app.listen(PORT, () => console.log(`Listening on port ${PORT}`));

