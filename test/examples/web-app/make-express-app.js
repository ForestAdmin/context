module.exports = ({ assertPresent, express }) => {
  assertPresent({ express });
  return express();
};
