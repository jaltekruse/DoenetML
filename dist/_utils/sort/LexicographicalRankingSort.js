/**
 * Compute the lexicographic rank of an item based on the previous and next rank.
 * 
 * Rules of lexicographic ordering:
 * 1. Compare first distinct character
 * 2. If both strings identical, for string A and string B:
 *    - len(A) == len(B) => 0
 *    - len(A) > len(B) => A > B
 *    - len(A) < len(B) => A < B
 * 
 * The algorithm first finds the position of the leftmost non-matching character
 * in prev and next. 
 * 
 * The identical substring of prev and next is used as the base of the sort order.
 * e.g. prev = 'abcde', next = 'abchi', str = 'abc'
 * If the first non-matching characters are not consecutive, the new order will
 * be generated by appending the character that is halfway in the alphabet
 * between the left and right character: str = 'abcf'
 * 
 * Otherwise, the first non-matching character from prev will be appended to the
 * sort order followed by the character halfway between the next character in 
 * prev and the end of alphabets.
 * e.g. prev = 'zy', next = 'zz', str = 'zyn'
 * 
 * @param {string} prev 
 * @param {string} next 
 */

 const LOWER_BOUND_ALPHACODE = 96;     // before 'a'
 const UPPER_BOUND_ALPHACODE = 123;    // after 'z'
 const CHAR_A_ALPHACODE = 97;          // char code for 'a'
 const CHAR_B_ALPHACODE = 98;          // char code for 'b'
 const CHAR_Z_ALPHACODE = 122;         // char code for 'z'
 
 export default function getSortOrder(prev, next) {
   let p, n, pos = 0, newOrder = "";
 
   // find first non-matching character
   while (p == n) {
     p = pos < prev.length ? prev.charCodeAt(pos) : LOWER_BOUND_ALPHACODE;
     n = pos < next.length ? next.charCodeAt(pos) : UPPER_BOUND_ALPHACODE;
     pos++;
   }
   newOrder = prev.slice(0, pos - 1);    // get identical substring
 
   if (p === LOWER_BOUND_ALPHACODE) {    // prev string equals next[0:pos]
     while (n === CHAR_A_ALPHACODE) {    // next character is 'a'
       n = pos < next.length ? next.charCodeAt(pos++) : UPPER_BOUND_ALPHACODE;
       newOrder += "a";                  // insert an 'a' to match the 'a'
     }
     if (n === CHAR_B_ALPHACODE) {       // next character is 'b'
       newOrder += "a";                  // insert an 'a' to match the 'b'
       n = UPPER_BOUND_ALPHACODE;
     }
   } else if (p + 1 === n) {             // prev, next are consecutive
     newOrder += String.fromCharCode(p); // insert character from prev
     n = UPPER_BOUND_ALPHACODE;          // set to end of alphabet
     p = pos < prev.length ? prev.charCodeAt(pos++) : LOWER_BOUND_ALPHACODE;
     while (p === CHAR_Z_ALPHACODE) {
       p = pos < prev.length ? prev.charCodeAt(pos++) : LOWER_BOUND_ALPHACODE;
       newOrder += "z";                  // insert 'z' to match 'z'
     }
   }
   const middleCharacter = String.fromCharCode(Math.ceil(n - (n - p) / 2));
   newOrder += middleCharacter;
   
   return newOrder;
 }
 