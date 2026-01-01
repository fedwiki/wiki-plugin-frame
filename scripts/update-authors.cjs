const gitAuthors = require('grunt-git-authors');

gitAuthors.updatePackageJson({}, (error) => {
  if (error) {
    console.log('Error: ', error);
  }
});

gitAuthors.updateAuthors({}, (error, filename) => {
  if (error) {
    console.log('Error: ', error);
  } else {
    console.log(filename, 'updated');
  }
});
