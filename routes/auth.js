import { Router } from 'express';
import passport from 'passport';
import bcrypt from 'bcrypt';
import User from '../models/User.js';

const router = Router();

//register
router.get('/register', (req,res)=>res.render('register.ejs',{msg:req.flash('error')}));
router.post('/register', async (req,res)=>{
  const { name, email, password } = req.body;
  if (await User.exists({ email })) return res.redirect('/register?msg=Email+in+use');
  const hash = await bcrypt.hash(password,12);
  const user = await User.create({ name, email, password:hash });
  req.login(user, err => err ? res.redirect('/login') : res.redirect('/dashboard'));
});

//login
router.get('/login', (req,res)=>res.render('login.ejs',{msg:req.flash('error')}));
router.post('/login',
  passport.authenticate('local-login',{
    successRedirect:'/dashboard',
    failureRedirect:'/login',
    failureFlash:true
  })
);

//logout
router.get('/logout',(req,res)=>req.logout(()=>res.redirect('/login')));

export default router;
