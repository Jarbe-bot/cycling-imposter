
import { Cyclist, Quiz } from './types';

export const INITIAL_CYCLISTS: Cyclist[] = [
  {
    id: 'c1',
    name: 'Mark Cavendish',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA58fLAPOnZ02eriidiI9xlRuEw7xu0x-_ph1SzJYaPWZMTxLI5O_hyNEkTnEWQfNMz-XRDE_nV2D_G912lPtjvayZfCpC-cJHK-t8e2vg6o3YjDsO0Bzy3xm8-2Av1uasTsZrUSVFrjQbEHng-xiUbacxD2ZQ5HOuLuYXslMAceN1NnzxBToD69FnD9KBSK9JhGTxhQcwhp7QqTrKTaVKzGfbD09FP9EFdXPqDQWQFgI6b1MKrVa5MI5nrX8p2bZ3MfcgQR4z_SlOa',
    country: 'United Kingdom',
    team: 'Astana Qazaqstan',
    status: 'retired',
    lastUpdated: '2023-10-24'
  },
  {
    id: 'c2',
    name: 'Peter Sagan',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDGaGe0fNKnsByWyg9Y0fsCYC30RX1wdgo5aL5B5GMFjSBLzsui76B2Kqh_Xnh5uq-biGE9Du0DSb0cVSi0x8kVktzRq0cDmiOZS_gf3sDUiAvakM4JUReLuVKiZhrDd7coLWoMC5x0QvvH1Q2W2DIgDUfwvBh27iwuqMO1RlVX8dFbNt4gYv-NgdmkVbyjOWkvXu0G5qzRZHa6PMB-H1P6S5B-RJaZp46lm7n75J8QtLUCWGpnvP-hP2nEmaf-oMlFZ0MOBGstx0dt',
    country: 'Slovakia',
    team: 'TotalEnergies',
    status: 'retired',
    lastUpdated: '2023-10-24'
  },
  {
    id: 'c3',
    name: 'Eddy Merckx',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCfhVzNDCtKUui0OTWZRcHiD7oc88zeoisKcm6vEtnqvqtIiycAu4ya9wcRiE8AU2H1ccHUwuhMa02-2Jqx5aiRz-FLD4ceJnRErurf5AakFR7tevRqYZlar6TiL7ovPXGnUWJXIsOU5zRvrHWKYtC4rpUNN0DiitIH0Si33EsFTq7tH5I8lINGj9n9pcpWnr00kc4c4cCdc-J7UY_6PPY91InHJLnR4Q8YNZGggshGwLtohYeJK4quch2S_bw5kCwR_Wa7N3XyyNzs',
    country: 'Belgium',
    team: 'Molteni',
    status: 'retired',
    lastUpdated: '2023-09-12'
  },
  {
    id: 'c4',
    name: 'Bernard Hinault',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA1qQv64ZhQNUxIuPM4R981en52miX-BkQ23WFvZK-HA-IOg5ki0t9mgYY3iVbAO6flzvv9FuQPhVhREe8TVM-R3IMPaPnu5zjfzOa413eeUkyTA4XodY0Dtros2IoM0dPK7SJdTsxkXaMuSetFXHmG-CZqw6kkwQXxw4j28Yq3-IxAM_TLXCrh1P6ITeBN3gGhB1ZfzHCChbV-xFHy9_Ujy92H-Hn33x8Z-XfjsHQcQK_kyO45mIyerp8PalPZUpZgS3XnXirPPGRO',
    country: 'France',
    team: 'La Vie Claire',
    status: 'retired',
    lastUpdated: '2023-08-05'
  },
  {
    id: 'c5',
    name: 'Chris Froome',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBDsjyWDJFhZ0MzT13NY9fmJpkkfyeg77wUlRSs27kr4o23zXaIwT7saubi2W564kqqxH7O5cJ9Q5zhW7enuuMwl5W9j16coP-K31qb1qdbGegUtRQvDBTHBoC6evTPEe-WnTS4FlBYF_KAjmCWtput8d_55sMV6URWa3rmpF-izSLXO8e1gQueuxTjenin2Mmro2jFD1yaIB0Ed7zdtA-_IvApWMIE4mSoJZe5ac4EGXvGJQz9CH7cKdPEMP_c-Kxtc0i3qiC5og8l',
    country: 'United Kingdom',
    team: 'Israel-Premier Tech',
    status: 'active',
    lastUpdated: '2023-10-24'
  },
  {
    id: 'c6',
    name: 'Tadej Pogačar',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAvKlH8KHDcbTbE_ot3Hu5hoshWeyjdfLN5DCxd4MHRzICsbGI4IwEKZiGrIKO8cv35mosXzxjH3q9ZdqtTZWMI7n5MN8XWymgftk5TjAYUP0k1Uwuo40qeqbbFt8PfnNmS-j-B_2DmK-B9PytcXQAi1edJu3j3P33DB4PW64xC5g-LyI1eSoOkpBhQ1ug0G78t_xc9X9cEfLdHdIoBuR39NLziPCE2JRkrqjg4d0Hsq-A7R43QDwvmqCZioDjwZGXwEm1P1uIE-wiz',
    country: 'Slovenia',
    team: 'UAE Team Emirates',
    status: 'active',
    lastUpdated: '2023-10-24'
  },
  {
    id: 'c7',
    name: 'Lance Armstrong',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBr2Z5qmHFHtfzs0b3sOVhrTwIvV7pPB8g4HqB61-_QfNc9_zNG3YX6oDyQGExuP6ywLnvQPLHTRRMAjqxBhscfNTVj23NdjHhr3UOR1Dq1JBcYOXqeq50A1dOQPn84efOLYM__IU8aDgTlC7KM04nQnprZ_-OppSpxRJZanXPGQ1JukEgrXzhd5xiusZzG5iQQqO2x1ud5H6fMtgJ5hpEGz50nNuL7OEHAshUHSLjarYRjZZavkzl87dfYyIzxfsy8F2yYmj21wj2z',
    country: 'USA',
    team: 'US Postal',
    status: 'retired',
    lastUpdated: '2023-01-20'
  },
  {
    id: 'c8',
    name: 'Miguel Induráin',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCVcTkNQNXSjQIfXMUCu6Su_k-hV-dQkBDlzOG7XRIPW3oKkKY7ahtGeeufCjY23quJNuCR-cqUazMWa0_NYkF-oVipeT6xd8jYR04wUoUVdz9mtlFqgtFNcXsNAFk9fyQzyH9ZQfF6LEZzlzk-qpt6kybJdTvTnlvbXy8LZ-o45ysRmb0Ly3tdh3vyL_Zxc_-JwDvDvHq4gjBkgCCjwFXnrS_P-ST-SnHZlTybpthtKIINCq0fGszcl-xBUnc7sc5C3usW_JpKuAEQ',
    country: 'Spain',
    team: 'Banesto',
    status: 'retired',
    lastUpdated: '2022-12-15'
  }
];

export const INITIAL_QUIZ: Quiz = {
  id: 'q1',
  date: '2023-10-25',
  statement: '10+ Stage Wins TDF',
  slots: [
    { cyclistId: 'c1', isImposter: false },
    { cyclistId: 'c2', isImposter: false },
    { cyclistId: 'c3', isImposter: false },
    { cyclistId: 'c4', isImposter: false },
    { cyclistId: 'c5', isImposter: true },
    { cyclistId: 'c6', isImposter: false },
    { cyclistId: 'c7', isImposter: false },
    { cyclistId: 'c8', isImposter: false },
  ],
  isLive: true
};
